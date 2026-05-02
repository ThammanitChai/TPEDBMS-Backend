const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (or Admin only in production)
const SUPERADMIN_CODE = 'TPEDBMS_ADMIN';

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, adminCode } = req.body;

    if (role === 'superadmin') {
      if (adminCode !== SUPERADMIN_CODE) {
        return res.status(400).json({ message: 'รหัสพิเศษ Super Admin ไม่ถูกต้อง' });
      }
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'sales',
      phone,
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      token: generateToken(user._id),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      if (!user.isActive || user.isArchived) {
        return res.status(403).json({ message: 'บัญชีของคุณถูกระงับหรือถูกลบออกจากระบบ' });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json(req.user);
};

module.exports = { registerUser, loginUser, getMe };
