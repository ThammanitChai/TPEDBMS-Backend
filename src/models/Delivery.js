const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema(
  {
    deliveryDate: { type: Date, required: true },
    vehicleType: { type: String, default: '' },
    driver: { type: String, default: '' },
    origin: { type: String, default: '' },
    destination: { type: String, required: true },
    recipientName: { type: String, required: true },
    deliveryStatus: {
      type: String,
      enum: ['รอดำเนินการ', 'กำลังจัดส่ง', 'จัดส่งแล้ว', 'ยกเลิก'],
      default: 'รอดำเนินการ',
    },
    notes: { type: String, default: '' },
    recipientConfirmed: { type: Boolean, default: false },
    responsibleUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    relatedDeal: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

deliverySchema.index({ assignedTo: 1, deliveryDate: -1 });

module.exports = mongoose.model('Delivery', deliverySchema);
