const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ['register', 'reset'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 600 }, // 10 min TTL
});

module.exports = mongoose.model('Otp', otpSchema);
