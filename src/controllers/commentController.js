const Comment = require('../models/Comment');
const User = require('../models/User');
const Notification = require('../models/Notification');

// @desc    Get comments for a target user
// @route   GET /api/comments?targetUserId=:id
// @access  Admin (or self)
const getComments = async (req, res, next) => {
  try {
    const { targetUserId } = req.query;
    if (!targetUserId) return res.status(400).json({ message: 'ต้องระบุ targetUserId' });

    // Only admin/superadmin or the target user can view their comments
    if (
      req.user.role === 'sales' &&
      req.user._id.toString() !== targetUserId
    ) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
    }

    const comments = await Comment.find({ targetUser: targetUserId })
      .populate('author', 'name email avatar role')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    next(error);
  }
};

// @desc    Create comment targeting a user
// @route   POST /api/comments
// @access  Admin / SuperAdmin
const createComment = async (req, res, next) => {
  try {
    const { targetUserId, text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'กรุณากรอกข้อความ' });
    if (!targetUserId) return res.status(400).json({ message: 'ต้องระบุผู้รับ' });

    const target = await User.findById(targetUserId).select('name');
    if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });

    const comment = await Comment.create({
      author: req.user._id,
      targetUser: targetUserId,
      text: text.trim(),
    });

    await comment.populate('author', 'name email avatar role');

    // Notify the target user
    await Notification.create({
      user: targetUserId,
      title: 'มีข้อความถึงคุณ',
      message: `${req.user.name}: ${text.trim().slice(0, 80)}`,
      type: 'comment',
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${targetUserId}`).emit('notification', {
        title: 'มีข้อความถึงคุณ',
        message: `${req.user.name}: ${text.trim().slice(0, 80)}`,
      });
    }

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Author or Admin
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'ไม่พบ comment' });

    if (
      comment.author.toString() !== req.user._id.toString() &&
      req.user.role === 'sales'
    ) {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบ' });
    }

    await comment.deleteOne();
    res.json({ message: 'ลบ comment แล้ว' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getComments, createComment, deleteComment };
