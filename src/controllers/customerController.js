const Customer = require('../models/Customer');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get customers (own customers for sales, all for admin)
// @route   GET /api/customers
// @access  Private
const getCustomers = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (req.user.role === 'sales') {
      query.salesPerson = req.user._id;
    }

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;

    const customers = await Customer.find(query)
      .populate('salesPerson', 'name email')
      .sort({ createdAt: -1 });

    res.json(customers);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single customer
// @route   GET /api/customers/:id
// @access  Private
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).populate(
      'salesPerson',
      'name email phone'
    );
    if (!customer) return res.status(404).json({ message: 'ไม่พบลูกค้า' });

    if (
      req.user.role === 'sales' &&
      customer.salesPerson._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ดูข้อมูลนี้' });
    }

    res.json(customer);
  } catch (error) {
    next(error);
  }
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res, next) => {
  try {
    const customerData = {
      ...req.body,
      salesPerson: req.user._id,
    };

    const customer = await Customer.create(customerData);

    // Create notification for admins
    const admins = await User.find({ role: 'admin' });
    const notifications = admins.map((admin) => ({
      user: admin._id,
      title: 'ลูกค้าใหม่',
      message: `${req.user.name} เพิ่มลูกค้าใหม่: ${customer.companyName}`,
      type: 'new_customer',
      relatedCustomer: customer._id,
    }));
    await Notification.insertMany(notifications);

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      admins.forEach((admin) => {
        io.to(`user_${admin._id}`).emit('notification', {
          title: 'ลูกค้าใหม่',
          message: `${req.user.name} เพิ่มลูกค้าใหม่: ${customer.companyName}`,
        });
      });
    }

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
};

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Private
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'ไม่พบลูกค้า' });

    if (
      req.user.role === 'sales' &&
      customer.salesPerson.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไข' });
    }

    Object.assign(customer, req.body);
    await customer.save();

    res.json(customer);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Private
const deleteCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'ไม่พบลูกค้า' });

    if (
      req.user.role === 'sales' &&
      customer.salesPerson.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบ' });
    }

    await customer.deleteOne();
    res.json({ message: 'ลบลูกค้าเรียบร้อย' });
  } catch (error) {
    next(error);
  }
};

// @desc    Add visit
// @route   POST /api/customers/:id/visits
// @access  Private
const addVisit = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'ไม่พบลูกค้า' });

    if (
      req.user.role === 'sales' &&
      customer.salesPerson.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    }

    customer.visits.push(req.body);
    await customer.save();

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
};

// @desc    Dashboard statistics for admin
// @route   GET /api/customers/stats/dashboard
// @access  Admin
const getDashboardStats = async (req, res, next) => {
  try {
    const totalCustomers = await Customer.countDocuments();
    const totalSales = await User.countDocuments({ role: 'sales', isActive: true });

    const statusCounts = await Customer.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Visits per sales (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const salesActivity = await Customer.aggregate([
      { $unwind: '$visits' },
      { $match: { 'visits.visitDate': { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$salesPerson',
          visitCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'salesInfo',
        },
      },
      { $unwind: '$salesInfo' },
      {
        $project: {
          salesName: '$salesInfo.name',
          salesEmail: '$salesInfo.email',
          visitCount: 1,
        },
      },
      { $sort: { visitCount: -1 } },
    ]);

    // Recent visits
    const recentVisits = await Customer.aggregate([
      { $unwind: '$visits' },
      { $sort: { 'visits.visitDate': -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'salesPerson',
          foreignField: '_id',
          as: 'sales',
        },
      },
      { $unwind: '$sales' },
      {
        $project: {
          companyName: 1,
          contactPerson: 1,
          visit: '$visits',
          salesName: '$sales.name',
        },
      },
    ]);

    res.json({
      totalCustomers,
      totalSales,
      statusCounts,
      salesActivity,
      recentVisits,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addVisit,
  getDashboardStats,
};
