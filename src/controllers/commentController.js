const Comment = require('../models/Comment');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Notification = require('../models/Notification');

// @desc    Get comments — by targetUserId OR targetCustomerId
// @route   GET /api/comments?targetUserId=:id  OR  ?targetCustomerId=:id
// @access  Private
const getComments = async (req, res, next) => {
  try {
    const { targetUserId, targetCustomerId } = req.query;
    if (!targetUserId && !targetCustomerId) {
      return res.status(400).json({ message: 'ต้องระบุ targetUserId หรือ targetCustomerId' });
    }

    let query = {};
    if (targetUserId) {
      // Sales can only read their own comments; admin can read anyone's
      if (req.user.role === 'sales' && req.user._id.toString() !== targetUserId) {
        return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
      }
      query.targetUser = targetUserId;
    } else {
      // For customer comments: sales can read if they own the customer
      if (req.user.role === 'sales') {
        const cust = await Customer.findById(targetCustomerId).select('salesPerson');
        if (!cust || cust.salesPerson.toString() !== req.user._id.toString()) {
          return res.status(403).json({ message: 'ไม่มีสิทธิ์' });
        }
      }
      query.targetCustomer = targetCustomerId;
    }

    const comments = await Comment.find(query)
      .populate('author', 'name email avatar role')
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    next(error);
  }
};

// @desc    Create comment (target user OR customer)
// @route   POST /api/comments
// @access  Admin / SuperAdmin
const createComment = async (req, res, next) => {
  try {
    const { targetUserId, targetCustomerId, text, photo } = req.body;
    if (!text?.trim() && !photo) return res.status(400).json({ message: 'กรุณากรอกข้อความหรือแนบรูป' });
    if (!targetUserId && !targetCustomerId) {
      return res.status(400).json({ message: 'ต้องระบุผู้รับ' });
    }

    const commentData = {
      author: req.user._id,
      text: text?.trim() || '',
      photo: photo || null,
    };

    let notifyUserId = null;
    let notifyTitle = 'มีข้อความถึงคุณ';

    if (targetUserId) {
      const target = await User.findById(targetUserId).select('name');
      if (!target) return res.status(404).json({ message: 'ไม่พบผู้ใช้' });
      commentData.targetUser = targetUserId;
      notifyUserId = targetUserId;
    } else {
      const cust = await Customer.findById(targetCustomerId)
        .select('companyName salesPerson')
        .populate('salesPerson', '_id');
      if (!cust) return res.status(404).json({ message: 'ไม่พบลูกค้า' });
      commentData.targetCustomer = targetCustomerId;
      notifyUserId = cust.salesPerson?._id;
      notifyTitle = `Comment บนลูกค้า: ${cust.companyName}`;
    }

    const comment = await Comment.create(commentData);
    await comment.populate('author', 'name email avatar role');

    // Notify
    if (notifyUserId && notifyUserId.toString() !== req.user._id.toString()) {
      await Notification.create({
        user: notifyUserId,
        title: notifyTitle,
        message: `${req.user.name}: ${text.trim().slice(0, 80)}`,
        type: 'comment',
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user_${notifyUserId}`).emit('notification', {
          title: notifyTitle,
          message: `${req.user.name}: ${text.trim().slice(0, 80)}`,
        });
      }
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
