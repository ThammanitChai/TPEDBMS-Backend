const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    visitDate: {
      type: Date,
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['planned', 'completed', 'cancelled'],
      default: 'completed',
    },
    photos: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const customerSchema = new mongoose.Schema(
  {
    customerCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    companyName: {
      type: String,
      required: [true, 'กรุณากรอกชื่อบริษัท'],
      trim: true,
    },
    contactPerson: {
      type: String,
      required: [true, 'กรุณากรอกชื่อผู้ติดต่อ'],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'กรุณากรอกเบอร์โทร'],
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    companyImage: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    mapLink: {
      type: String,
      default: '',
    },
    location: {
      lat: { type: Number, default: 13.7563 },
      lng: { type: Number, default: 100.5018 },
    },
    followUpDetails: {
      type: String,
      default: '',
    },
    visits: [visitSchema],
    nextVisitDate: {
      type: Date,
      default: null,
    },
    nextVisitDeadline: {
      type: Date,
      default: null,
    },
    nextVisitType: {
      type: String,
      enum: ['date', 'range', 'deadline'],
      default: 'date',
    },
    status: {
      type: String,
      enum: ['lead', 'prospect', 'customer', 'inactive', 'กำลังติดตาม', 'ลูกค้าของเรา', 'ยกเลิกติดตาม', 'หนี้เสีย'],
      default: 'กำลังติดตาม',
    },
    salesPerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    photos: {
      type: [String],
      default: [],
    },
    tags: [String],
    leadSource: {
      type: String,
      enum: ['Line @', 'โทรเข้าออฟฟิษ', 'Email online / Email info', 'Contact Form WWW / Quotation Form WWW', 'มีคนแนะนำ', ''],
      default: '',
    },
    creditType: { type: String, default: '' },
    customerType: {
      type: String,
      enum: ['general', 'project'],
      default: 'general',
    },
    projectContacts: [
      {
        name:     { type: String, default: '' },
        position: { type: String, default: '' },
        company:  { type: String, default: '' },
        phone:    { type: String, default: '' },
        email:    { type: String, default: '' },
        note:     { type: String, default: '' },
      },
    ],
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

customerSchema.index({ companyName: 'text', contactPerson: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
