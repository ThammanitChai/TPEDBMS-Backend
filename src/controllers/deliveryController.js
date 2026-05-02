const Delivery = require('../models/Delivery');

// @desc  Get all deliveries (admin: all, sales: own only)
// @route GET /api/deliveries
const getAll = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (req.user.role === 'sales') {
      filter.assignedTo = req.user._id;
    }
    if (status) filter.deliveryStatus = status;
    if (search) {
      filter.$or = [
        { recipientName: { $regex: search, $options: 'i' } },
        { destination: { $regex: search, $options: 'i' } },
        { origin: { $regex: search, $options: 'i' } },
        { driver: { $regex: search, $options: 'i' } },
      ];
    }

    const deliveries = await Delivery.find(filter)
      .populate('assignedTo', 'name department')
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
    const populated = await delivery.populate('assignedTo', 'name department');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc  Update delivery
// @route PUT /api/deliveries/:id
const update = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'ไม่พบรายการจัดส่ง' });

    if (req.user.role === 'sales' && delivery.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขรายการนี้' });
    }

    const updated = await Delivery.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name department');
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc  Delete delivery
// @route DELETE /api/deliveries/:id
const remove = async (req, res, next) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'ไม่พบรายการจัดส่ง' });

    if (req.user.role === 'sales' && delivery.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบรายการนี้' });
    }

    await delivery.deleteOne();
    res.json({ message: 'ลบรายการจัดส่งแล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
