const User = require('../models/User');
const Otp = require('../models/Otp');
const generateToken = require('../utils/generateToken');
const { sendOtpEmail } = require('../utils/emailService');
const crypto = require('crypto');

const SUPERADMIN_CODE = 'TPEDBMS_ADMIN';

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, adminCode, department, salesDivision } = req.body;

    if (role === 'superadmin' && adminCode !== SUPERADMIN_CODE) {
      return res.status(400).json({ message: 'รหัสพิเศษ Super Admin ไม่ถูกต้อง' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    const user = await User.create({
      name, email, password,
      role: role || 'sales',
      phone,
      department: department || '',
      salesDivision: salesDivision || '',
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      token: generateToken(user),
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
        allowedMenus: user.allowedMenus || [],
        token: generateToken(user),
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

// @desc    Send OTP to email
// @route   POST /api/auth/send-otp
// @access  Public
const sendOtp = async (req, res, next) => {
  try {
    const { email, type } = req.body;
    if (!email || !['register', 'reset'].includes(type)) {
      return res.status(400).json({ message: 'ข้อมูลไม่ครบถ้วน' });
    }

    if (type === 'reset') {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีที่ใช้อีเมลนี้' });
    }

    if (type === 'register') {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    // Remove old OTPs for this email+type
    await Otp.deleteMany({ email, type });

    const otp = generateOtp();
    await Otp.create({ email, otp, type });
    await sendOtpEmail(email, otp, type);

    res.json({ message: 'ส่ง OTP ไปยังอีเมลแล้ว' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP (for registration — just validate, not delete yet)
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp, type } = req.body;
    const record = await Otp.findOne({ email, otp, type });
    if (!record) return res.status(400).json({ message: 'OTP ไม่ถูกต้องหรือหมดอายุแล้ว' });
    res.json({ message: 'OTP ถูกต้อง' });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password after OTP verification
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' });
    }

    const record = await Otp.findOne({ email, otp, type: 'reset' });
    if (!record) return res.status(400).json({ message: 'OTP ไม่ถูกต้องหรือหมดอายุแล้ว' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'ไม่พบบัญชีผู้ใช้' });

    user.password = newPassword;
    await user.save();
    await Otp.deleteMany({ email, type: 'reset' });

    res.json({ message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่' });
  } catch (error) {
    next(error);
  }
};

// @desc    Register with OTP verification
// @route   POST /api/auth/register-verified
// @access  Public
const registerVerified = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, adminCode, department, salesDivision, otp } = req.body;

    const record = await Otp.findOne({ email, otp, type: 'register' });
    if (!record) return res.status(400).json({ message: 'OTP ไม่ถูกต้องหรือหมดอายุแล้ว' });

    if (role === 'superadmin' && adminCode !== SUPERADMIN_CODE) {
      return res.status(400).json({ message: 'รหัสพิเศษ Super Admin ไม่ถูกต้อง' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });

    const user = await User.create({
      name, email, password,
      role: role || 'sales',
      phone,
      department: department || '',
      salesDivision: salesDivision || '',
    });

    await Otp.deleteMany({ email, type: 'register' });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      token: generateToken(user),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, loginUser, getMe, sendOtp, verifyOtp, resetPassword, registerVerified };
