const Sale = require('../models/Sale');

const getSales = async (req, res, next) => {
  try {
    const { search, product, customerType, from, to, salesPersonId } = req.query;
    let query = {};

    if (req.user.role === 'sales') {
      query.salesPerson = req.user._id;
    } else if (salesPersonId) {
      query.salesPerson = salesPersonId;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { product: { $regex: search, $options: 'i' } },
        { province: { $regex: search, $options: 'i' } },
      ];
    }
    if (product) query.product = { $regex: product, $options: 'i' };
    if (customerType) query.customerType = customerType;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const sales = await Sale.find(query)
      .populate('salesPerson', 'name')
      .sort({ date: -1 });

    res.json(sales);
  } catch (error) {
    next(error);
  }
};

const createSale = async (req, res, next) => {
  try {
    const sale = await Sale.create({ ...req.body, salesPerson: req.user._id });
    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
};

const updateSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'ไม่พบรายการ' });
    if (req.user.role === 'sales' && sale.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไข' });
    }
    Object.assign(sale, req.body);
    await sale.save();
    res.json(sale);
  } catch (error) {
    next(error);
  }
};

const deleteSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'ไม่พบรายการ' });
    if (req.user.role === 'sales' && sale.salesPerson.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบ' });
    }
    await sale.deleteOne();
    res.json({ message: 'ลบเรียบร้อย' });
  } catch (error) {
    next(error);
  }
};

const getSaleStats = async (req, res, next) => {
  try {
    const { salesPersonId } = req.query;
    let match = {};
    if (req.user.role === 'sales') {
      match.salesPerson = req.user._id;
    } else if (salesPersonId) {
      const mongoose = require('mongoose');
      match.salesPerson = new mongoose.Types.ObjectId(salesPersonId);
    }

    const [totals] = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          totalQty: { $sum: '$quantity' },
        },
      },
    ]);

    const byProduct = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$product',
          totalAmount: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
          totalQty: { $sum: '$quantity' },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
    ]);

    const byCustomerType = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customerType',
          totalAmount: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const byMonth = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
          },
          totalAmount: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const byProvince = await Sale.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$province',
          totalAmount: { $sum: '$amount' },
          totalOrders: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      totals: totals || { totalAmount: 0, totalOrders: 0, totalQty: 0 },
      byProduct,
      byCustomerType,
      byMonth,
      byProvince,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSales, createSale, updateSale, deleteSale, getSaleStats };
