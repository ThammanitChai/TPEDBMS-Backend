const express = require('express');
const router = express.Router();
const {
  getDirectory,
  resetUserPassword,
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
  changePassword,
  getColleagues,
  updateUserMenus,
  createTargetRequest,
  getTargetRequests,
  reviewTargetRequest,
} = require('../controllers/userController');
const { protect, adminOnly, superAdminOnly, approverOnly } = require('../middleware/auth');

router.get('/directory', protect, getDirectory);
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.patch('/me/password', protect, changePassword);
router.get('/colleagues', protect, getColleagues);

router.get('/', protect, adminOnly, getAllUsers);
router.get('/sales', protect, approverOnly, getAllSales);
router.get('/sales/:id', protect, approverOnly, getSalesDetail);

router.patch('/:id/reset-password', protect, adminOnly, resetUserPassword);
router.patch('/:id/toggle', protect, adminOnly, toggleUserStatus);
router.patch('/:id/archive', protect, adminOnly, archiveUser);
router.patch('/:id/restore', protect, superAdminOnly, restoreUser);
router.patch('/:id/role', protect, superAdminOnly, updateUserRole);
router.patch('/:id/department', protect, adminOnly, updateUserDepartment);
router.patch('/:id/profile', protect, adminOnly, updateSalesProfile);
router.patch('/:id/menus', protect, adminOnly, updateUserMenus);

router.get('/target-requests', protect, getTargetRequests);
router.post('/target-requests', protect, createTargetRequest);
router.patch('/target-requests/:id/review', protect, reviewTargetRequest);

module.exports = router;
