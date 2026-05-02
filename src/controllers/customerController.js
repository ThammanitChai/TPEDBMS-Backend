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
    query.isArchived = { $ne: true };

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

const generateCustomerCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `TP-${year}-`;
  const last = await Customer.findOne(
    { customerCode: { $regex: `^${prefix}` } },
    { customerCode: 1 },
    { sort: { customerCode: -1 } }
  );
  const seq = last
    ? parseInt(last.customerCode.replace(prefix, ''), 10) + 1
    : 1;
  return `${prefix}${String(seq).padStart(4, '0')}`;
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res, next) => {
  try {
    const customerCode = await generateCustomerCode();
    const customerData = {
      ...req.body,
      salesPerson: req.user._id,
      customerCode,
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

    customer.isArchived = true;
    await customer.save();
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

// @desc    Get calendar data (visits + appointments for a month)
// @route   GET /api/customers/calendar
// @access  Private
const getCalendar = async (req, res, next) => {
  try {
    const { year, month } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const m = parseInt(month) || new Date().getMonth() + 1;

    const startDate = new Date(y, m - 1, 1);
    const endDate = new Date(y, m, 0, 23, 59, 59);

    const baseMatch = req.user.role === 'sales'
      ? { salesPerson: req.user._id }
      : {};

    const visits = await Customer.aggregate([
      { $match: baseMatch },
      { $unwind: '$visits' },
      { $match: { 'visits.visitDate': { $gte: startDate, $lte: endDate } } },
      {
        $lookup: {
          from: 'users',
          localField: 'salesPerson',
          foreignField: '_id',
          as: 'sales',
        },
      },
      { $unwind: { path: '$sales', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          date: '$visits.visitDate',
          companyName: 1,
          notes: '$visits.notes',
          salesName: '$sales.name',
        },
      },
      { $sort: { date: 1 } },
    ]);

    const appointmentDocs = await Customer.find({
      ...baseMatch,
      nextVisitDate: { $gte: startDate, $lte: endDate },
    })
      .populate('salesPerson', 'name')
      .select('companyName nextVisitDate contactPerson salesPerson _id');

    res.json({
      visits: visits.map((v) => ({
        date: v.date,
        customerId: v._id,
        companyName: v.companyName,
        salesName: v.salesName || '',
        notes: v.notes || '',
      })),
      appointments: appointmentDocs.map((a) => ({
        date: a.nextVisitDate,
        customerId: a._id,
        companyName: a.companyName,
        salesName: a.salesPerson?.name || '',
        contactPerson: a.contactPerson,
      })),
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
  getCalendar,
};
