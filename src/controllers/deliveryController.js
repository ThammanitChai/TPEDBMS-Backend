const Delivery = require('../models/Delivery');

const USER_SELECT = 'name avatar title department role';

// @desc  Get all deliveries — all users see all (cross-team visibility)
// @route GET /api/deliveries
const getAll = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.deliveryStatus = status;
    if (search) {
      filter.$or = [
        { recipientName: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { origin: { $regex: search, $options: 'i' } },
        { driver: { $regex: search, $options: 'i' } },
        { relatedDeal: { $regex: search, $options: 'i' } },
      ];
    }

    const deliveries = await Delivery.find(filter)
      .populate('assignedTo', USER_SELECT)
      .populate('responsibleUsers', USER_SELECT)
      .sort({ deliveryDate: -1 });

    res.json(deliveries);
  } catch (error) {
    next(error);
  }
};

// @desc  Create delivery
// @route POST /api/deliveries
const create = async (req, res, next) => {
  try {
    const delivery = await Delivery.create({ ...req.body, assignedTo: req.user._id });
    await delivery.populate([
      { path: 'assignedTo', select: USER_SELECT },
      { path: 'responsibleUsers', select: USER_SELECT },
    ]);
    res.status(201).json(delivery);
  } catch (error) {
    next(error);
  }
};

// @desc  Update delivery — responsible user or admin can update
// @route PUT /api/deliveries/:id
const update = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'ไม่พบรายการจัดส่ง' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = delivery.assignedTo.toString() === req.user._id.toString();
    const isResponsible = delivery.responsibleUsers.map((u) => u.toString()).includes(req.user._id.toString());

    if (!isAdmin && !isOwner && !isResponsible) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขรายการนี้' });
    }

    const updated = await Delivery.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', USER_SELECT)
      .populate('responsibleUsers', USER_SELECT);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc  Delete delivery — owner or admin only
// @route DELETE /api/deliveries/:id
const remove = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'ไม่พบรายการจัดส่ง' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = delivery.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบรายการนี้' });
    }

    await delivery.deleteOne();
    res.json({ message: 'ลบรายการจัดส่งแล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
