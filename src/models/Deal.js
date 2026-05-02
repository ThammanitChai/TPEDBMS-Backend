const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema(
  {
    quotationNo: { type: String, trim: true, default: '' },
    leadSource: {
      type: String,
      enum: ['โทรเข้า', 'Referral', 'Facebook', 'Line', 'Google', 'งานแสดงสินค้า', 'อื่นๆ', ''],
      default: '',
    },
    customerName: { type: String, required: true },
    province: { type: String, default: '' },
    quotedPrice: { type: Number, default: 0 },
    dealStatus: {
      type: String,
      enum: ['Open', 'Won', 'Lost'],
      default: 'Open',
    },
    followUpDate: { type: Date, default: null },
    salesDivision: {
      type: String,
      enum: ['อุตสาหกรรม', 'ครัวเรือน', ''],
      default: '',
    },
    product: { type: String, default: '' },
    notes: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

dealSchema.index({ assignedTo: 1, dealStatus: 1 });

module.exports = mongoose.model('Deal', dealSchema);
