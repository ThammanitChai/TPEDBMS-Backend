const User = require('../models/User');
const Customer = require('../models/Customer');

// @desc    Get all sales users (Admin only)
// @route   GET /api/users/sales
// @access  Admin
const getAllSales = async (req, res, next) => {
  try {
    const sales = await User.find({ role: 'sales' }).select('-password');

    // Get customer count and visit count for each sales
    const salesWithStats = await Promise.all(
      sales.map(async (s) => {
        const customers = await Customer.find({ salesPerson: s._id });
        const totalVisits = customers.reduce(
          (acc, c) => acc + (c.visits ? c.visits.length : 0),
          0
        );
        const lastVisit = customers
          .flatMap((c) => c.visits || [])
          .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))[0];

        return {
          ...s.toObject(),
          customerCount: customers.length,
          totalVisits,
          lastVisitDate: lastVisit ? lastVisit.visitDate : null,
        };
      })
    );

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

    if (!sales) {
      return res.status(404).json({ message: 'ไม่พบเซลล์' });
    }

    let query = { salesPerson: req.params.id };
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { contactPerson: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    res.json({ sales, customers });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Admin
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status
// @route   PATCH /api/users/:id/toggle
// @access  Admin
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: 'อัปเดตสถานะแล้ว', isActive: user.isActive });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllSales, getSalesDetail, getAllUsers, toggleUserStatus };
