const mongoose = require('mongoose');

// Daily paragraph note per user per date
const workPlanNoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    content: { type: String, default: '' },
  },
  { timestamps: true }
);

workPlanNoteSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WorkPlanNote', workPlanNoteSchema);
