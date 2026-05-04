const MarketingActivity = require('../models/MarketingActivity');
const MarketingMetric = require('../models/MarketingMetric');

// @desc  Get all marketing activities (admin: all, sales: own only)
// @route GET /api/marketing
const getAll = async (req, res, next) => {
  try {
    const { search } = req.query;
    const filter = {};

    if (req.user.role === 'sales') {
      filter.assignedTo = req.user._id;
    }
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { channel: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const activities = await MarketingActivity.find(filter)
      .populate('assignedTo', 'name department avatar')
      .sort({ activityDate: -1 });

    res.json(activities);
  } catch (error) {
    next(error);
  }
};

// @desc  Create marketing activity
// @route POST /api/marketing
const create = async (req, res, next) => {
  try {
    const { mediaFiles, ...rest } = req.body;
    const activity = await MarketingActivity.create({
      ...rest,
      mediaFiles: Array.isArray(mediaFiles) ? mediaFiles : [],
      assignedTo: req.user._id,
    });
    const populated = await activity.populate('assignedTo', 'name department avatar');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc  Update marketing activity
// @route PUT /api/marketing/:id
const update = async (req, res, next) => {
  try {
    const activity = await MarketingActivity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'ไม่พบกิจกรรม' });

    if (req.user.role === 'sales' && activity.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขกิจกรรมนี้' });
    }

    const updated = await MarketingActivity.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name department avatar');
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc  Delete marketing activity
// @route DELETE /api/marketing/:id
const remove = async (req, res, next) => {
  try {
    const activity = await MarketingActivity.findById(req.params.id);
    if (!activity) return res.status(404).json({ message: 'ไม่พบกิจกรรม' });

    if (req.user.role === 'sales' && activity.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบกิจกรรมนี้' });
    }

    await activity.deleteOne();
    res.json({ message: 'ลบกิจกรรมแล้ว' });
  } catch (error) {
    next(error);
  }
};

// ── Marketing Metrics ─────────────────────────────────────────────────────────

// @desc  Get metrics for date range
// @route GET /api/marketing/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD
const getMetrics = async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    const metrics = await MarketingMetric.find(filter).sort({ date: 1 });
    res.json(metrics);
  } catch (error) {
    next(error);
  }
};

// @desc  Upsert metrics for a specific date
// @route PUT /api/marketing/metrics/:date
const upsertMetrics = async (req, res, next) => {
  try {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ message: 'รูปแบบวันที่ไม่ถูกต้อง (YYYY-MM-DD)' });
    }
    const data = { ...req.body, date, createdBy: req.user._id, updatedByName: req.user.name || '' };
    const metric = await MarketingMetric.findOneAndUpdate(
      { date },
      data,
      { upsert: true, new: true, runValidators: true }
    );
    res.json(metric);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove, getMetrics, upsertMetrics };
