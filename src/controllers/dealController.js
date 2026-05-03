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
      Deal.aggregate([{ $match: matchFilter }, { $group: { _id: '$dealStatus', count: { $sum: 1 } } }]),
      Deal.aggregate([{ $match: matchFilter }, { $group: { _id: '$dealStatus', totalPrice: { $sum: '$quotedPrice' } } }]),
    ]);

    const stats = { Open: { count: 0, totalPrice: 0 }, Won: { count: 0, totalPrice: 0 }, Lost: { count: 0, totalPrice: 0 } };
    countAgg.forEach(({ _id, count }) => { if (stats[_id]) stats[_id].count = count; });
    sumAgg.forEach(({ _id, totalPrice }) => { if (stats[_id]) stats[_id].totalPrice = totalPrice; });

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
      .select({ 'files.data': 0 })
      .populate('assignedTo', 'name department')
      .populate('files.uploadedBy', 'name');
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
