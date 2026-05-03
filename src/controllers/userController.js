const User = require('../models/User');
const Customer = require('../models/Customer');

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

    const customers = await Customer.find(query).select('-visits').sort({ createdAt: -1 });
    res.json({ sales, customers });
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

module.exports = {
  getAllSales,
  getSalesDetail,
  getAllUsers,
  toggleUserStatus,
  archiveUser,
  restoreUser,
  updateUserRole,
  updateUserDepartment,
  updateSalesProfile,
};
