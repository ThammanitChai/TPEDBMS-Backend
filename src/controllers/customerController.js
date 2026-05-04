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
      .select('-visits')
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

const escRx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const generateCustomerCode = async (codeMode, params) => {
  if (codeMode === 'manual') {
    const raw = params.codeManual?.trim();
    if (!raw) throw Object.assign(new Error('กรุณาระบุรหัสลูกค้า'), { status: 400 });
    return `M-${raw}`;
  }

  // Auto mode
  const { codeDiv, codeType, codeBiz, codeZone } = params;
  if (!codeDiv || !codeType || !codeBiz || !codeZone) {
    throw Object.assign(new Error('กรุณาระบุข้อมูลรหัสลูกค้าให้ครบถ้วน'), { status: 400 });
  }
  const prefix = `${codeDiv}${codeType}-${codeBiz}-${codeZone}-`;
  const existing = await Customer.find(
    { customerCode: { $regex: `^${escRx(prefix)}\\d+-A$` } },
    { customerCode: 1 }
  ).lean();
  const maxSeq = existing.reduce((max, c) => {
    const m = c.customerCode.match(/-(\d+)-A$/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}-A`;
};

// @desc    Create customer
// @route   POST /api/customers
// @access  Private
const createCustomer = async (req, res, next) => {
  try {
    const { codeMode = 'auto', codeDiv, codeType, codeBiz, codeZone, codeManual, customerCode: _c, ...customerData } = req.body;
    const customerCode = await generateCustomerCode(codeMode, { codeDiv, codeType, codeBiz, codeZone, codeManual });
    customerData.salesPerson = req.user._id;
    customerData.customerCode = customerCode;

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
          visit: {
            _id: '$visits._id',
            visitDate: '$visits.visitDate',
            notes: '$visits.notes',
            status: '$visits.status',
          },
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
      isArchived: { $ne: true },
      $or: [
        // Start date within this month (with or without deadline)
        { nextVisitDate: { $gte: startDate, $lte: endDate } },
        // Started before this month but deadline overlaps (ongoing range)
        { nextVisitDate: { $lt: startDate }, nextVisitDeadline: { $gte: startDate } },
      ],
    })
      .populate('salesPerson', 'name')
      .select('companyName nextVisitDate nextVisitDeadline contactPerson salesPerson _id');

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
        deadline: a.nextVisitDeadline || null,
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

// @desc    Get visits + appointments + sales for a specific day (admin date picker)
// @route   GET /api/customers/stats/day?date=YYYY-MM-DD
// @access  Admin
const getDayStats = async (req, res, next) => {
  try {
    const Sale = require('../models/Sale');
    const d = req.query.date ? new Date(req.query.date) : new Date();
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const end   = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

    const [visits, appointments, sales] = await Promise.all([
      // Visits completed on that day
      Customer.aggregate([
        { $unwind: '$visits' },
        { $match: { 'visits.visitDate': { $gte: start, $lte: end } } },
        { $lookup: { from: 'users', localField: 'salesPerson', foreignField: '_id', as: 'sp' } },
        { $unwind: { path: '$sp', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            companyName: 1, contactPerson: 1, phone: 1, status: 1,
            visit: {
              _id: '$visits._id',
              visitDate: '$visits.visitDate',
              notes: '$visits.notes',
              status: '$visits.status',
            },
            salesName: '$sp.name',
          },
        },
        { $sort: { 'visit.visitDate': -1 } },
      ]),

      // Customers with nextVisitDate on that day (appointments)
      Customer.find({ nextVisitDate: { $gte: start, $lte: end }, isArchived: { $ne: true } })
        .populate('salesPerson', 'name')
        .select('companyName contactPerson phone nextVisitDate salesPerson status'),

      // Sales records for that day
      Sale.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $lookup: { from: 'users', localField: 'salesPerson', foreignField: '_id', as: 'sp' } },
        { $unwind: { path: '$sp', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            amount: 1, product: 1, date: 1, platform: 1, channel: 1, customerName: 1,
            salesName: '$sp.name',
          },
        },
        { $sort: { date: -1 } },
      ]),
    ]);

    const totalSalesAmount = sales.reduce((s, r) => s + (r.amount || 0), 0);

    res.json({ date: start, visits, appointments, sales, totalSalesAmount });
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
  getDayStats,
};
