const mongoose = require('mongoose');

const workPlanCommentSchema = new mongoose.Schema(
  {
    planOwnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true }, // "YYYY-MM-DD"
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

workPlanCommentSchema.index({ planOwnerId: 1, date: 1, createdAt: -1 });

module.exports = mongoose.model('WorkPlanComment', workPlanCommentSchema);
