const User = require('../models/User');
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

// @desc    Get all sales users (Admin only)
// @route   GET /api/users/sales
// @access  Admin
const getAllSales = async (req, res, next) => {
  try {
    const sales = await User.find({ role: 'sales', isArchived: { $ne: true } }).select('-password');

    // Single aggregation across all sales users — avoids loading photos
    const statsAgg = await Customer.aggregate([
      { $match: { isArchived: { $ne: true } } },
      {
        $group: {
          _id: '$salesPerson',
          customerCount: { $sum: 1 },
          totalVisits: { $sum: { $size: { $ifNull: ['$visits', []] } } },
          lastVisitDate: { $max: '$visits.visitDate' },
        },
      },
    ]);

    const statsMap = {};
    statsAgg.forEach((s) => { statsMap[s._id.toString()] = s; });

    const salesWithStats = sales.map((s) => {
      const stat = statsMap[s._id.toString()] || {};
      return {
        ...s.toObject(),
        customerCount: stat.customerCount || 0,
        totalVisits: stat.totalVisits || 0,
        lastVisitDate: stat.lastVisitDate || null,
      };
    });

    res.json(salesWithStats);
  } catch (error) {
    next(error);
  }
};

// @desc    Get sales user detail with customers
// @route   GET /api/users/sales/:id
// @access  Admin
const getSalesDetail = async (req, res, next) => {
  try {
    const { search } = req.query;
    const sales = await User.findById(req.params.id).select('-password');

    if (!sales) return res.status(404).json({ message: 'ไม่พบเซลล์' });

    let query = { salesPerson: req.params.id, isArchived: { $ne: true } };
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const mongoose = require('mongoose');
    const salesObjId = new mongoose.Types.ObjectId(req.params.id);

    const now = new Date();
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const curEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [customers, [curRow], [prevRow]] = await Promise.all([
      Customer.find(query).select('-visits').sort({ createdAt: -1 }),
      Sale.aggregate([
        { $match: { salesPerson: salesObjId, date: { $gte: curStart, $lte: curEnd } } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalOrders: { $sum: 1 } } },
      ]),
      Sale.aggregate([
        { $match: { salesPerson: salesObjId, date: { $gte: prevStart, $lte: prevEnd } } },
        { $group: { _id: null, totalAmount: { $sum: '$amount' }, totalOrders: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      sales,
      customers,
      currentMonthSales: curRow?.totalAmount || 0,
      currentMonthOrders: curRow?.totalOrders || 0,
      prevMonthSales: prevRow?.totalAmount || 0,
      prevMonthOrders: prevRow?.totalOrders || 0,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users (Admin/SuperAdmin)
// @route   GET /api/users
// @access  Admin
const getAllUsers = async (req, res, next) => {
  try {
    const { includeArchived } = req.query;
    const filter = req.user.role === 'superadmin' && includeArchived === 'true'
      ? {}
      : { isArchived: { $ne: true } };
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active (suspend/unsuspend) — Admin
// @route   PATCH /api/users/:id/toggle
// @access  Admin
const toggleUserStatus = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    if (req.user.role === 'admin' && target.role === 'superadmin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์จัดการ Super Admin' });
    }

    target.isActive = !target.isActive;
    await target.save();
    res.json({ message: 'อัปเดตสถานะแล้ว', isActive: target.isActive });
  } catch (error) {
    next(error);
  }
};

// @desc    Archive user (soft delete) — Admin can archive sales/admin, SuperAdmin can archive anyone
// @route   PATCH /api/users/:id/archive
// @access  Admin
const archiveUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    if (target._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'ไม่สามารถ Archive ตัวเองได้' });
    }
    if (req.user.role === 'admin' && (target.role === 'superadmin' || target.role === 'admin')) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ Archive ผู้ดูแลระบบ' });
    }

    target.isArchived = true;
    target.isActive = false;
    await target.save();
    res.json({ message: `Archive ${target.name} แล้ว` });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore archived user — SuperAdmin only
// @route   PATCH /api/users/:id/restore
// @access  SuperAdmin
const restoreUser = async (req, res, next) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    target.isArchived = false;
    target.isActive = true;
    await target.save();
    res.json({ message: `Restore ${target.name} แล้ว` });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role — SuperAdmin only
// @route   PATCH /api/users/:id/role
// @access  SuperAdmin
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['superadmin', 'admin', 'sales'].includes(role)) {
      return res.status(400).json({ message: 'Role ไม่ถูกต้อง' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    target.role = role;
    await target.save();
    res.json({ message: `เปลี่ยน Role เป็น ${role} แล้ว`, user: target });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user department & salesDivision — Admin/SuperAdmin
// @route   PATCH /api/users/:id/department
// @access  Admin
const updateUserDepartment = async (req, res, next) => {
  try {
    const { department, salesDivision } = req.body;
    const validDepts = ['ฝ่ายขาย', 'ฝ่ายการตลาด', 'ฝ่ายช่าง', 'ฝ่ายขนส่ง', 'ทีมโปรเจกต์', ''];
    const validDivisions = ['อุตสาหกรรม', 'ครัวเรือน', ''];

    if (department !== undefined && !validDepts.includes(department)) {
      return res.status(400).json({ message: 'แผนกไม่ถูกต้อง' });
    }
    if (salesDivision !== undefined && !validDivisions.includes(salesDivision)) {
      return res.status(400).json({ message: 'แผนกขายไม่ถูกต้อง' });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    if (department !== undefined) target.department = department;
    if (salesDivision !== undefined) target.salesDivision = salesDivision;
    await target.save();

    res.json({ message: 'อัปเดตแผนกแล้ว', user: target });
  } catch (error) {
    next(error);
  }
};

// @desc    Update employee profile fields (employeeId, zone, salesTarget) — Admin
// @route   PATCH /api/users/:id/profile
// @access  Admin
const updateSalesProfile = async (req, res, next) => {
  try {
    const { employeeId, zone, salesTarget } = req.body;
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    if (employeeId !== undefined) target.employeeId = employeeId;
    if (zone !== undefined) target.zone = zone;
    if (salesTarget !== undefined) target.salesTarget = Number(salesTarget) || 0;

    await target.save();
    res.json({ message: 'อัปเดตโปรไฟล์พนักงานแล้ว', user: target });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all active users for directory / multi-select (no salary data)
// @route   GET /api/users/directory
// @access  Private (all roles)
const getDirectory = async (req, res, next) => {
  try {
    const users = await User.find({ isArchived: { $ne: true } })
      .select('name avatar title department salesDivision zone role')
      .sort({ department: 1, name: 1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Get own profile
// @route   GET /api/users/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    next(error);
  }
};

// @desc    Update own profile (avatar, title, expertise, phone, name)
// @route   PATCH /api/users/me
// @access  Private
const updateMe = async (req, res, next) => {
  try {
    const { avatar, title, expertise, phone, name } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (title !== undefined) user.title = title.trim();
    if (expertise !== undefined) user.expertise = expertise;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();
    const updated = user.toObject();
    delete updated.password;
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get colleagues in same department (no salary/target data)
// @route   GET /api/users/colleagues
// @access  Private
const getColleagues = async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('department');
    if (!me || !me.department) return res.json([]);

    const colleagues = await User.find({
      department: me.department,
      isArchived: { $ne: true },
      _id: { $ne: req.user._id },
    }).select('name avatar title expertise zone department salesDivision role');

    res.json(colleagues);
  } catch (error) {
    next(error);
  }
};

// @desc    Update allowed menus for a sales user — Admin/SuperAdmin
// @route   PATCH /api/users/:id/menus
// @access  Admin
const updateUserMenus = async (req, res, next) => {
  try {
    const { allowedMenus } = req.body;
    if (!Array.isArray(allowedMenus)) {
      return res.status(400).json({ message: 'allowedMenus ต้องเป็น array' });
    }
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { allowedMenus },
      { new: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDirectory,
  getAllSales,
  getSalesDetail,
  getAllUsers,
  toggleUserStatus,
  archiveUser,
  restoreUser,
  updateUserRole,
  updateUserDepartment,
  updateSalesProfile,
  getMe,
  updateMe,
  getColleagues,
  updateUserMenus,
};
