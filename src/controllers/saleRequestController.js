const SaleRequest = require('../models/SaleRequest');
const Sale = require('../models/Sale');
const Notification = require('../models/Notification');
const User = require('../models/User');

const APPROVER_ROLES = ['admin', 'superadmin', 'manager_general', 'manager_industrial', 'manager_household'];

const getSaleRequests = async (req, res, next) => {
  try {
    const { status, salesPersonId } = req.query;
    let query = {};

    if (req.user.role === 'sales') {
      query.salesPerson = req.user._id;
    } else if (APPROVER_ROLES.includes(req.user.role)) {
      if (status) query.status = status;
      if (salesPersonId) query.salesPerson = salesPersonId;
    }

    const requests = await SaleRequest.find(query)
      .populate('salesPerson', 'name')
      .populate('reviewedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    next(error);
  }
};

const createSaleRequest = async (req, res, next) => {
  try {
    const saleRequest = await SaleRequest.create({
      ...req.body,
      salesPerson: req.user._id,
    });

    // Notify all admins
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });
    const io = req.app.get('io');

    await Promise.all(
      admins.map(async (admin) => {
        await Notification.create({
          user: admin._id,
          title: 'คำสั่งขายใหม่',
          message: `${req.user.name} ส่งคำสั่งขาย: ${saleRequest.product} - ฿${saleRequest.amount}`,
          type: 'sale_request',
          relatedSaleRequest: saleRequest._id,
        });
        if (io) {
          io.to(`user_${admin._id}`).emit('notification', {
            title: 'คำสั่งขายใหม่',
            message: `${req.user.name} ส่งคำสั่งขาย: ${saleRequest.product} - ฿${saleRequest.amount}`,
          });
        }
      })
    );

    res.status(201).json(saleRequest);
  } catch (error) {
    next(error);
  }
};

const reviewSaleRequest = async (req, res, next) => {
  try {
    const { action, rejectReason } = req.body;

    const saleRequest = await SaleRequest.findById(req.params.id).populate('salesPerson', 'name');
    if (!saleRequest) return res.status(404).json({ message: 'ไม่พบคำสั่งขาย' });
    if (saleRequest.status !== 'pending') {
      return res.status(400).json({ message: 'คำสั่งขายนี้ถูกดำเนินการแล้ว' });
    }

    const io = req.app.get('io');

    if (action === 'approve') {
      saleRequest.status = 'approved';
      saleRequest.reviewedBy = req.user._id;
      saleRequest.reviewedAt = new Date();
      await saleRequest.save();

      // Create a Sale record
      await Sale.create({
        date: saleRequest.date,
        customerName: saleRequest.customerName,
        province: saleRequest.province,
        product: saleRequest.product,
        quantity: saleRequest.quantity,
        amount: saleRequest.amount,
        customerType: saleRequest.customerType,
        hasDelivery: saleRequest.hasDelivery,
        notes: saleRequest.notes,
        salesPerson: saleRequest.salesPerson._id,
      });

      // Notify salesPerson
      await Notification.create({
        user: saleRequest.salesPerson._id,
        title: 'คำสั่งขายได้รับการอนุมัติ',
        message: `คำสั่งขาย ${saleRequest.product} ฿${saleRequest.amount} ได้รับการอนุมัติแล้ว`,
        type: 'sale_approved',
        relatedSaleRequest: saleRequest._id,
      });

      if (io) {
        io.to(`user_${saleRequest.salesPerson._id}`).emit('notification', {
          title: 'คำสั่งขายได้รับการอนุมัติ',
          message: `คำสั่งขาย ${saleRequest.product} ฿${saleRequest.amount} ได้รับการอนุมัติแล้ว`,
        });
      }
    } else if (action === 'reject') {
      saleRequest.status = 'rejected';
      saleRequest.rejectReason = rejectReason || '';
      saleRequest.reviewedBy = req.user._id;
      saleRequest.reviewedAt = new Date();
      await saleRequest.save();

      // Notify salesPerson
      await Notification.create({
        user: saleRequest.salesPerson._id,
        title: 'คำสั่งขายถูกปฏิเสธ',
        message: `คำสั่งขาย ${saleRequest.product} ถูกปฏิเสธ: ${rejectReason || ''}`,
        type: 'sale_rejected',
        relatedSaleRequest: saleRequest._id,
      });

      if (io) {
        io.to(`user_${saleRequest.salesPerson._id}`).emit('notification', {
          title: 'คำสั่งขายถูกปฏิเสธ',
          message: `คำสั่งขาย ${saleRequest.product} ถูกปฏิเสธ: ${rejectReason || ''}`,
        });
      }
    } else {
      return res.status(400).json({ message: 'action ต้องเป็น approve หรือ reject' });
    }

    res.json(saleRequest);
  } catch (error) {
    next(error);
  }
};

const deleteSaleRequest = async (req, res, next) => {
  try {
    const saleRequest = await SaleRequest.findById(req.params.id);
    if (!saleRequest) return res.status(404).json({ message: 'ไม่พบคำสั่งขาย' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    if (!isAdmin) {
      if (saleRequest.salesPerson.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบ' });
      }
      if (saleRequest.status !== 'pending') {
        return res.status(400).json({ message: 'ลบได้เฉพาะรายการที่รออนุมัติเท่านั้น' });
      }
    }

    await saleRequest.deleteOne();
    res.json({ message: 'ลบเรียบร้อย' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSaleRequests, createSaleRequest, reviewSaleRequest, deleteSaleRequest };
