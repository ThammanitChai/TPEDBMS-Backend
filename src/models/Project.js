const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  dueDate: { type: Date },
  done: { type: Boolean, default: false },
}, { _id: true });

const projectSchema = new mongoose.Schema(
  {
    projectName: { type: String, required: true },
    budget: { type: Number, default: 0 },
    teamMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    startDate: { type: Date },
    endDate: { type: Date },
    milestones: { type: [milestoneSchema], default: [] },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    issues: { type: String, default: '' },
    status: {
      type: String,
      enum: ['กำลังดำเนินการ', 'เสร็จสิ้น', 'หยุดชั่วคราว', 'ยกเลิก'],
      default: 'กำลังดำเนินการ',
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

projectSchema.index({ assignedTo: 1, status: 1 });

module.exports = mongoose.model('Project', projectSchema);
