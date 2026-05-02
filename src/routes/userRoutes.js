const express = require('express');
const router = express.Router();
const {
  getAllSales,
  getSalesDetail,
  getAllUsers,
  toggleUserStatus,
  archiveUser,
  restoreUser,
  updateUserRole,
} = require('../controllers/userController');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, getAllUsers);
router.get('/sales', protect, adminOnly, getAllSales);
router.get('/sales/:id', protect, adminOnly, getSalesDetail);

router.patch('/:id/toggle', protect, adminOnly, toggleUserStatus);
router.patch('/:id/archive', protect, adminOnly, archiveUser);
router.patch('/:id/restore', protect, superAdminOnly, restoreUser);
router.patch('/:id/role', protect, superAdminOnly, updateUserRole);

module.exports = router;
