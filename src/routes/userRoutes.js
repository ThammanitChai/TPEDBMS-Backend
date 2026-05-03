const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/userController');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

router.get('/directory', protect, getDirectory);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.get('/colleagues', protect, getColleagues);

router.get('/', protect, adminOnly, getAllUsers);
router.get('/sales', protect, adminOnly, getAllSales);
router.get('/sales/:id', protect, adminOnly, getSalesDetail);

router.patch('/:id/toggle', protect, adminOnly, toggleUserStatus);
router.patch('/:id/archive', protect, adminOnly, archiveUser);
router.patch('/:id/restore', protect, superAdminOnly, restoreUser);
router.patch('/:id/role', protect, superAdminOnly, updateUserRole);
router.patch('/:id/department', protect, adminOnly, updateUserDepartment);
router.patch('/:id/profile', protect, adminOnly, updateSalesProfile);
router.patch('/:id/menus', protect, adminOnly, updateUserMenus);

module.exports = router;
