const express = require('express');
const router = express.Router();
const {
  getAllSales,
  getSalesDetail,
  getAllUsers,
  toggleUserStatus,
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/', protect, adminOnly, getAllUsers);
router.get('/sales', protect, adminOnly, getAllSales);
router.get('/sales/:id', protect, adminOnly, getSalesDetail);
router.patch('/:id/toggle', protect, adminOnly, toggleUserStatus);

module.exports = router;
