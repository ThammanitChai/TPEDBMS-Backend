const ServiceJob = require('../models/ServiceJob');

// @desc  Get all service jobs (admin: all, sales: own only)
// @route GET /api/service-jobs
const getAll = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (req.user.role === 'sales') {
      filter.assignedTo = req.user._id;
    }
    if (status) filter.result = status;
    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { problemDesc: { $regex: search, $options: 'i' } },
        { assignedTech: { $regex: search, $options: 'i' } },
      ];
    }

    const jobs = await ServiceJob.find(filter)
      .populate('assignedTo', 'name department avatar')
      .sort({ jobDate: -1 });

    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

// @desc  Create service job
// @route POST /api/service-jobs
const create = async (req, res, next) => {
  try {
    const { beforePhotos, afterPhotos, ...rest } = req.body;
    const job = await ServiceJob.create({
      ...rest,
      beforePhotos: Array.isArray(beforePhotos) ? beforePhotos : [],
      afterPhotos: Array.isArray(afterPhotos) ? afterPhotos : [],
      assignedTo: req.user._id,
    });
    const populated = await job.populate('assignedTo', 'name department avatar');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc  Update service job
// @route PUT /api/service-jobs/:id
const update = async (req, res, next) => {
  try {
    const job = await ServiceJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'ไม่พบงานช่าง' });

    if (req.user.role === 'sales' && job.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขงานนี้' });
    }

    const updated = await ServiceJob.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name department avatar');
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc  Delete service job
// @route DELETE /api/service-jobs/:id
const remove = async (req, res, next) => {
  try {
    const job = await ServiceJob.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'ไม่พบงานช่าง' });

    if (req.user.role === 'sales' && job.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบงานนี้' });
    }

    await job.deleteOne();
    res.json({ message: 'ลบงานช่างแล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
