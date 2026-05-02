const Deal = require('../models/Deal');

// @desc  Get all deals (admin: all, sales: own only)
// @route GET /api/deals
const getAll = async (req, res, next) => {
  try {
    const { status, search, salesDivision } = req.query;
    const filter = {};

    if (req.user.role === 'sales') {
      filter.assignedTo = req.user._id;
    }
    if (status) filter.dealStatus = status;
    if (salesDivision) filter.salesDivision = salesDivision;
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { product: { $regex: search, $options: 'i' } },
        { quotationNo: { $regex: search, $options: 'i' } },
      ];
    }

    const deals = await Deal.find(filter)
      .populate('assignedTo', 'name department')
      .sort({ followUpDate: -1, createdAt: -1 });

    res.json(deals);
  } catch (error) {
    next(error);
  }
};

// @desc  Get deal stats
// @route GET /api/deals/stats
const getDealStats = async (req, res, next) => {
  try {
    const matchFilter = req.user.role === 'sales' ? { assignedTo: req.user._id } : {};

    const [countAgg, sumAgg] = await Promise.all([
      Deal.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$dealStatus', count: { $sum: 1 } } },
      ]),
      Deal.aggregate([
        { $match: matchFilter },
        { $group: { _id: '$dealStatus', totalPrice: { $sum: '$quotedPrice' } } },
      ]),
    ]);

    const stats = { Open: { count: 0, totalPrice: 0 }, Won: { count: 0, totalPrice: 0 }, Lost: { count: 0, totalPrice: 0 } };
    countAgg.forEach(({ _id, count }) => { if (stats[_id] !== undefined) stats[_id].count = count; });
    sumAgg.forEach(({ _id, totalPrice }) => { if (stats[_id] !== undefined) stats[_id].totalPrice = totalPrice; });

    res.json(stats);
  } catch (error) {
    next(error);
  }
};

// @desc  Create deal
// @route POST /api/deals
const create = async (req, res, next) => {
  try {
    const deal = await Deal.create({ ...req.body, assignedTo: req.user._id });
    const populated = await deal.populate('assignedTo', 'name department');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc  Update deal
// @route PUT /api/deals/:id
const update = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'ไม่พบดีล' });

    if (req.user.role === 'sales' && deal.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขดีลนี้' });
    }

    const updated = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name department');
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc  Delete deal
// @route DELETE /api/deals/:id
const remove = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'ไม่พบดีล' });

    if (req.user.role === 'sales' && deal.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบดีลนี้' });
    }

    await deal.deleteOne();
    res.json({ message: 'ลบดีลแล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getDealStats, create, update, remove };
