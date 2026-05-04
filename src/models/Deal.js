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
      enum: ['ขอใบเสนอราคา', 'ส่งใบเสนอราคา', 'กำลังต่อรอง', 'ลูกค้าสั่งซื้อ', 'ยกเลิกสั่งซื้อ', 'Open', 'Won', 'Lost'],
      default: 'ขอใบเสนอราคา',
    },
    followUpDate: { type: Date, default: null },
    salesDivision: {
      type: String,
      enum: ['อุตสาหกรรม', 'ครัวเรือน', ''],
      default: '',
    },
    product: { type: String, default: '' },
    items: [
      {
        code:      { type: String, default: '' },
        name:      { type: String, default: '' },
        spec:      { type: String, default: '' },
        qty:       { type: Number, default: 1, min: 1 },
        unitPrice: { type: Number, default: 0, min: 0 },
      },
    ],
    notes: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    saleRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'SaleRequest', default: null },
    files: [
      {
        filename:   { type: String, required: true },
        mimeType:   { type: String, default: 'application/octet-stream' },
        size:       { type: Number, default: 0 },
        data:       { type: String, required: true },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

dealSchema.index({ assignedTo: 1, dealStatus: 1 });

module.exports = mongoose.model('Deal', dealSchema);
