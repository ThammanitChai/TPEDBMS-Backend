const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'ไม่ได้รับอนุญาต - ไม่พบ token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user || !req.user.isActive || req.user.isArchived) {
      return res.status(401).json({ message: 'ผู้ใช้ไม่ถูกต้องหรือถูกระงับ' });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
  }
};

// admin + superadmin
const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin')) {
    next();
  } else {
    res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
  }
};

// superadmin only
const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'เฉพาะ Super Admin เท่านั้น' });
  }
};

module.exports = { protect, adminOnly, superAdminOnly };
