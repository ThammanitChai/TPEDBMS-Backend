const mongoose = require('mongoose');

const targetChangeRequestSchema = new mongoose.Schema(
  {
    salesPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    currentTarget: { type: Number, required: true },
    requestedTarget: { type: Number, required: true },
    reason: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    rejectReason: { type: String, default: '' },
  },
  { timestamps: true }
);

targetChangeRequestSchema.index({ salesPerson: 1, status: 1 });

module.exports = mongoose.model('TargetChangeRequest', targetChangeRequestSchema);
