const Deal = require('../models/Deal');

const FILE_LIMIT = 8 * 1024 * 1024; // 8 MB raw → ~10.7 MB base64

// @desc  Get all deals — strips file binary data from list
// @route GET /api/deals
const getAll = async (req, res, next) => {
  try {
    const { status, search, salesDivision } = req.query;
    const filter = {};

    if (req.user.role === 'sales') filter.assignedTo = req.user._id;
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
      .select({ 'files.data': 0 })
      .populate('assignedTo', 'name department')
      .populate('files.uploadedBy', 'name')
      .populate('saleRequestId', 'status')
      .sort({ followUpDate: -1, createdAt: -1 });

    res.json(deals);
  } catch (error) {
    next(error);
  }
};

// @desc  Get deal stats
// @route GET /api/deals/stats
const STATUS_KEYS = ['ขอใบเสนอราคา', 'ส่งใบเสนอราคา', 'กำลังต่อรอง', 'ลูกค้าสั่งซื้อ', 'ยกเลิกสั่งซื้อ'];

const getDealStats = async (req, res, next) => {
  try {
    const matchFilter = req.user.role === 'sales' ? { assignedTo: req.user._id } : {};

    const agg = await Deal.aggregate([
      { $match: matchFilter },
      { $group: { _id: '$dealStatus', count: { $sum: 1 }, totalPrice: { $sum: '$quotedPrice' } } },
    ]);

    const stats = {};
    STATUS_KEYS.forEach((k) => { stats[k] = { count: 0, totalPrice: 0 }; });
    agg.forEach(({ _id, count, totalPrice }) => {
      if (stats[_id]) { stats[_id].count = count; stats[_id].totalPrice = totalPrice; }
    });

    // pipeline = sum of first 3 statuses
    const pipeline = STATUS_KEYS.slice(0, 3).reduce(
      (s, k) => ({ count: s.count + stats[k].count, totalPrice: s.totalPrice + stats[k].totalPrice }),
      { count: 0, totalPrice: 0 }
    );

    res.json({ ...stats, pipeline });
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

    const prevStatus = deal.dealStatus;
    const updated = await Deal.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .select({ 'files.data': 0 })
      .populate('assignedTo', 'name department')
      .populate('files.uploadedBy', 'name');

    // Auto-create SaleRequest when deal reaches ลูกค้าสั่งซื้อ (only once)
    if (req.body.dealStatus === 'ลูกค้าสั่งซื้อ' && prevStatus !== 'ลูกค้าสั่งซื้อ') {
      const SaleRequest = require('../models/SaleRequest');
      const productText = deal.items?.length > 0
        ? deal.items.map((i) => `${i.code} x${i.qty}`).join(', ')
        : (deal.product || '-');
      const totalQty = deal.items?.length > 0
        ? deal.items.reduce((s, i) => s + (i.qty || 1), 0)
        : 1;
      const sr = await SaleRequest.create({
        date: new Date(),
        customerName: deal.customerName,
        province: deal.province || '',
        product: productText,
        quantity: totalQty,
        amount: Math.round((deal.quotedPrice || 0) * (1 - (deal.discount || 0) / 100)),
        notes: `จากใบเสนอราคา${deal.quotationNo ? ` ${deal.quotationNo}` : ''}`,
        salesPerson: deal.assignedTo,
        status: 'pending',
      });
      await Deal.findByIdAndUpdate(req.params.id, { saleRequestId: sr._id });
      updated.saleRequestId = { _id: sr._id, status: 'pending' };
    }

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

// @desc  Upload file to deal
// @route POST /api/deals/:id/files
const uploadFile = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'ไม่พบดีล' });

    if (req.user.role === 'sales' && deal.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    }

    const { filename, mimeType, size, data } = req.body;
    if (!filename || !data) return res.status(400).json({ message: 'ข้อมูลไฟล์ไม่ครบ' });
    if (size > FILE_LIMIT) return res.status(400).json({ message: 'ไฟล์ต้องมีขนาดไม่เกิน 8 MB' });

    deal.files.push({ filename, mimeType, size, data, uploadedBy: req.user._id });
    await deal.save();

    const fileEntry = deal.files[deal.files.length - 1];
    res.status(201).json({
      _id: fileEntry._id,
      filename: fileEntry.filename,
      mimeType: fileEntry.mimeType,
      size: fileEntry.size,
      uploadedAt: fileEntry.uploadedAt,
      uploadedBy: { _id: req.user._id, name: req.user.name },
    });
  } catch (error) {
    next(error);
  }
};

// @desc  Download / get file data
// @route GET /api/deals/:id/files/:fileId
const getFile = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'ไม่พบดีล' });

    if (req.user.role === 'sales' && deal.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    }

    const file = deal.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'ไม่พบไฟล์' });

    // Strip base64 header and send as binary
    const base64Data = file.data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.filename)}"`);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

// @desc  Delete a file from deal
// @route DELETE /api/deals/:id/files/:fileId
const deleteFile = async (req, res, next) => {
  try {
    const deal = await Deal.findById(req.params.id);
    if (!deal) return res.status(404).json({ message: 'ไม่พบดีล' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isAdmin && deal.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    }

    const file = deal.files.id(req.params.fileId);
    if (!file) return res.status(404).json({ message: 'ไม่พบไฟล์' });

    file.deleteOne();
    await deal.save();
    res.json({ message: 'ลบไฟล์แล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getDealStats, create, update, remove, uploadFile, getFile, deleteFile };
