const WorkPlan = require('../models/WorkPlan');

// GET /api/workplan?year=2024&month=5  (or &week=startDate)
const getPlans = async (req, res, next) => {
  try {
    const { year, month, startDate, endDate } = req.query;
    const userId = req.user._id;

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

    const plans = await WorkPlan.find({ userId, date: { $gte: start, $lte: end } })
      .sort({ date: 1 });
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

module.exports = { getPlans, createPlan, updatePlan, deletePlan };
