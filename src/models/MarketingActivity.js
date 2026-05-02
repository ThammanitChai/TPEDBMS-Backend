const mongoose = require('mongoose');

const marketingActivitySchema = new mongoose.Schema(
  {
    activityDate: { type: Date, required: true },
    channel: {
      type: String,
      enum: ['Facebook', 'Line Official', 'Shopee', 'Lazada', 'Google Ads', 'TikTok', 'งานแสดงสินค้า', 'อื่นๆ', ''],
      default: '',
    },
    customerName: { type: String, default: '' },
    mediaFiles: { type: [String], default: [] },
    notes: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

marketingActivitySchema.index({ assignedTo: 1, activityDate: -1 });

module.exports = mongoose.model('MarketingActivity', marketingActivitySchema);
