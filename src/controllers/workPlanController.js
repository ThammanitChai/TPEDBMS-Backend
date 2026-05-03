const WorkPlan = require('../models/WorkPlan');
const WorkPlanNote = require('../models/WorkPlanNote');
const WorkPlanComment = require('../models/WorkPlanComment');
const User = require('../models/User');

const isAdmin = (u) => u.role === 'admin' || u.role === 'superadmin';

// GET /api/workplan
const getPlans = async (req, res, next) => {
  try {
    const { year, month, startDate, endDate, userId: queryUserId } = req.query;
    // Admin can view any user's plans; sales can only view their own
    const userId = isAdmin(req.user) && queryUserId ? queryUserId : req.user._id;

    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
    } else {
      const y = parseInt(year) || new Date().getFullYear();
      const m = parseInt(month) - 1 || new Date().getMonth();
      start = new Date(y, m, 1);
      end = new Date(y, m + 1, 0, 23, 59, 59, 999);
    }

    const plans = await WorkPlan.find({ userId, date: { $gte: start, $lte: end } }).sort({ date: 1 });
    res.json(plans);
  } catch (error) {
    next(error);
  }
};

// POST /api/workplan
const createPlan = async (req, res, next) => {
  try {
    const { date, type, note, customerName } = req.body;
    const plan = await WorkPlan.create({
      userId: req.user._id,
      date: new Date(date),
      type,
      note: note || '',
      customerName: customerName || '',
    });
    res.status(201).json(plan);
  } catch (error) {
    next(error);
  }
};

// PATCH /api/workplan/:id
const updatePlan = async (req, res, next) => {
  try {
    const plan = await WorkPlan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!plan) return res.status(404).json({ message: 'ไม่พบแผนงาน' });

    const { type, note, customerName, completed, actualNote } = req.body;
    if (type !== undefined) plan.type = type;
    if (note !== undefined) plan.note = note;
    if (customerName !== undefined) plan.customerName = customerName;
    if (completed !== undefined) plan.completed = completed;
    if (actualNote !== undefined) plan.actualNote = actualNote;

    await plan.save();
    res.json(plan);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/workplan/:id
const deletePlan = async (req, res, next) => {
  try {
    await WorkPlan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ message: 'ลบแผนงานแล้ว' });
  } catch (error) {
    next(error);
  }
};

// ── Sales Team List for Admin ─────────────────────────────────

// GET /api/workplan/team
const getSalesTeam = async (req, res, next) => {
  try {
    if (!isAdmin(req.user)) return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    const team = await User.find({ role: 'sales', isArchived: false })
      .select('name email department salesDivision salesTarget avatar isActive')
      .sort({ name: 1 });
    res.json(team);
  } catch (error) {
    next(error);
  }
};

// ── Daily Paragraph Note ──────────────────────────────────────

// GET /api/workplan/note?date=YYYY-MM-DD&userId=
const getNote = async (req, res, next) => {
  try {
    const { date, userId } = req.query;
    const targetId = (isAdmin(req.user) && userId) ? userId : req.user._id;
    const note = await WorkPlanNote.findOne({ userId: targetId, date });
    res.json(note || { content: '' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/workplan/note  (upsert)
const upsertNote = async (req, res, next) => {
  try {
    const { date, content } = req.body;
    const note = await WorkPlanNote.findOneAndUpdate(
      { userId: req.user._id, date },
      { content },
      { upsert: true, new: true }
    );
    res.json(note);
  } catch (error) {
    next(error);
  }
};

// ── Comments ──────────────────────────────────────────────────

// GET /api/workplan/comments?date=YYYY-MM-DD&userId=
const getComments = async (req, res, next) => {
  try {
    const { date, userId } = req.query;
    const planOwnerId = (isAdmin(req.user) && userId) ? userId : req.user._id;
    const comments = await WorkPlanComment.find({ planOwnerId, date })
      .populate('author', 'name avatar role')
      .sort({ createdAt: 1 });
    res.json(comments);
  } catch (error) {
    next(error);
  }
};

// POST /api/workplan/comments
const createComment = async (req, res, next) => {
  try {
    const { date, text, planOwnerId } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'กรุณากรอกข้อความ' });
    const comment = await WorkPlanComment.create({
      planOwnerId: planOwnerId || req.user._id,
      date,
      author: req.user._id,
      text: text.trim(),
    });
    await comment.populate('author', 'name avatar role');
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

// DELETE /api/workplan/comments/:id
const deleteComment = async (req, res, next) => {
  try {
    const c = await WorkPlanComment.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'ไม่พบ comment' });
    if (c.author.toString() !== req.user._id.toString() && req.user.role === 'sales') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    }
    await c.deleteOne();
    res.json({ message: 'ลบแล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getPlans, createPlan, updatePlan, deletePlan, getSalesTeam, getNote, upsertNote, getComments, createComment, deleteComment };
