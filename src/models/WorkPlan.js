const mongoose = require('mongoose');

const workPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['office', 'visit', 'leave', 'other'],
      required: true,
    },
    note: { type: String, default: '' },
    customerName: { type: String, default: '' },
    completed: { type: Boolean, default: false },
    actualNote: { type: String, default: '' },
  },
  { timestamps: true }
);

workPlanSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('WorkPlan', workPlanSchema);
