const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
  sendOtp,
  verifyOtp,
  resetPassword,
  registerVerified,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', registerUser);
router.post('/register-verified', registerVerified);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/reset-password', resetPassword);

module.exports = router;
