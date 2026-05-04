const mongoose = require('mongoose');

const editHistorySchema = new mongoose.Schema(
  {
    editedByName: { type: String, default: '' },
    editedAt:     { type: Date, default: Date.now },
    // snapshot of values BEFORE this edit
    prevType:         { type: String, default: '' },
    prevNote:         { type: String, default: '' },
    prevCustomerName: { type: String, default: '' },
    prevCompleted:    { type: Boolean, default: false },
    prevActualNote:   { type: String, default: '' },
  },
  { _id: true }
);

const workPlanSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    type: {
      type: String,
      enum: ['office', 'visit', 'leave', 'other'],
      required: true,
    },
    note:         { type: String, default: '' },
    customerName: { type: String, default: '' },
    completed:    { type: Boolean, default: false },
    actualNote:   { type: String, default: '' },
    source: { type: String, enum: ['manual', 'visit_auto'], default: 'manual' },
    editHistory: [editHistorySchema],
  },
  { timestamps: true }
);

workPlanSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('WorkPlan', workPlanSchema);
