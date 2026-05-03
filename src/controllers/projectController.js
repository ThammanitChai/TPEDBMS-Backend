const Project = require('../models/Project');

const MEMBER_SELECT = 'name avatar title department role';

// @desc  Get all projects — all users see all (cross-team visibility)
// @route GET /api/projects
const getAll = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { projectName: { $regex: search, $options: 'i' } },
        { issues: { $regex: search, $options: 'i' } },
      ];
    }

    const projects = await Project.find(filter)
      .populate('assignedTo', MEMBER_SELECT)
      .populate('teamMembers', MEMBER_SELECT)
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
    await project.populate([
      { path: 'assignedTo', select: MEMBER_SELECT },
      { path: 'teamMembers', select: MEMBER_SELECT },
    ]);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
};

// @desc  Update project — owner, team member, or admin can update
// @route PUT /api/projects/:id
const update = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'ไม่พบโปรเจกต์' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = project.assignedTo.toString() === req.user._id.toString();
    const isMember = project.teamMembers.map((m) => m.toString()).includes(req.user._id.toString());

    if (!isAdmin && !isOwner && !isMember) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขโปรเจกต์นี้' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
      .populate('assignedTo', MEMBER_SELECT)
      .populate('teamMembers', MEMBER_SELECT);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc  Delete project — owner or admin only
// @route DELETE /api/projects/:id
const remove = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'ไม่พบโปรเจกต์' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    const isOwner = project.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบโปรเจกต์นี้' });
    }

    await project.deleteOne();
    res.json({ message: 'ลบโปรเจกต์แล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
