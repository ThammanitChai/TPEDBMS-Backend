const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    customerName: { type: String, required: true, trim: true },
    province: { type: String, default: '', trim: true },
    product: { type: String, required: true, trim: true },
    quantity: { type: Number, default: 1, min: 1 },
    amount: { type: Number, required: true, min: 0 },
    customerType: { type: String, default: '' },
    hasDelivery: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    salesPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

saleSchema.index({ salesPerson: 1, date: -1 });
saleSchema.index({ date: -1 });

module.exports = mongoose.model('Sale', saleSchema);
