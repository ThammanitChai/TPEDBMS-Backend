const Project = require('../models/Project');

// @desc  Get all projects (admin: all, sales: own only)
// @route GET /api/projects
const getAll = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (req.user.role === 'sales') {
      filter.assignedTo = req.user._id;
    }
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { issues: { $regex: search, $options: 'i' } },
      ];
    }

    const projects = await Project.find(filter)
      .populate('assignedTo', 'name department')
      .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    next(error);
  }
};

// @desc  Create project
// @route POST /api/projects
const create = async (req, res, next) => {
  try {
    const project = await Project.create({ ...req.body, assignedTo: req.user._id });
    const populated = await project.populate('assignedTo', 'name department');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc  Update project
// @route PUT /api/projects/:id
const update = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'ไม่พบโปรเจกต์' });

    if (req.user.role === 'sales' && project.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขโปรเจกต์นี้' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', 'name department');
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc  Delete project
// @route DELETE /api/projects/:id
const remove = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'ไม่พบโปรเจกต์' });

    if (req.user.role === 'sales' && project.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบโปรเจกต์นี้' });
    }

    await project.deleteOne();
    res.json({ message: 'ลบโปรเจกต์แล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
