const express = require('express');
const router = express.Router();
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addVisit,
  getDashboardStats,
  getCalendar,
} = require('../controllers/customerController');
const { protect, adminOnly } = require('../middleware/auth');

router.get('/stats/dashboard', protect, adminOnly, getDashboardStats);
router.get('/calendar', protect, getCalendar);

router.route('/')
  .get(protect, getCustomers)
  .post(protect, createCustomer);

router.route('/:id')
  .get(protect, getCustomerById)
  .put(protect, updateCustomer)
  .delete(protect, deleteCustomer);

router.post('/:id/visits', protect, addVisit);

module.exports = router;
