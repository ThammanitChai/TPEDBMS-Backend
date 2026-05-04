const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return res.status(401).json({ message: 'ไม่ได้รับอนุญาต - ไม่พบ token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isActive) return res.status(401).json({ message: 'บัญชีถูกระงับ' });

    // Use JWT payload directly — no DB round-trip on every request
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      isActive: decoded.isActive,
      department: decoded.department || '',
      salesRoles: decoded.salesRoles || [],
      allowedMenus: decoded.allowedMenus || [],
    };
    next();
  } catch {
    res.status(401).json({ message: 'Token ไม่ถูกต้อง' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.role === 'admin' || req.user?.role === 'superadmin') return next();
  res.status(403).json({ message: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
};

const superAdminOnly = (req, res, next) => {
  if (req.user?.role === 'superadmin') return next();
  res.status(403).json({ message: 'เฉพาะ Super Admin เท่านั้น' });
};

const APPROVER_ROLES = ['admin', 'superadmin', 'manager_general', 'manager_industrial', 'manager_household'];

const approverOnly = (req, res, next) => {
  if (APPROVER_ROLES.includes(req.user?.role)) return next();
  res.status(403).json({ message: 'ไม่มีสิทธิ์อนุมัติ' });
};

module.exports = { protect, adminOnly, superAdminOnly, approverOnly };
