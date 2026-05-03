const mongoose = require('mongoose');

const saleRequestSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    customerName: { type: String, required: true, trim: true },
    province: { type: String, default: '', trim: true },
    product: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    customerType: { type: String, default: '' },
    platform: { type: String, default: '' },
    customerChannel: { type: String, default: '' },
    hasDelivery: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    salesPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
    rejectReason: { type: String, default: '' },
  },
  { timestamps: true }
);

saleRequestSchema.index({ salesPerson: 1, status: 1 });
saleRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('SaleRequest', saleRequestSchema);
