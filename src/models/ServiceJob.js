const mongoose = require('mongoose');

const serviceJobSchema = new mongoose.Schema(
  {
    jobDate: { type: Date, required: true },
    customerName: { type: String, required: true },
    problemDesc: { type: String, required: true },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    assignedTech: { type: String, default: '' },
    beforePhotos: { type: [String], default: [] },
    afterPhotos: { type: [String], default: [] },
    result: {
      type: String,
      enum: ['สำเร็จ', 'ไม่สำเร็จ', 'อยู่ระหว่างดำเนินการ'],
      default: 'อยู่ระหว่างดำเนินการ',
    },
    notes: { type: String, default: '' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

serviceJobSchema.index({ assignedTo: 1, jobDate: -1 });

module.exports = mongoose.model('ServiceJob', serviceJobSchema);
