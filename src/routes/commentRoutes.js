const express = require('express');
const router = express.Router();
const { getComments, createComment, deleteComment } = require('../controllers/commentController');
const { protect, managerOrAdminOnly } = require('../middleware/auth');

router.get('/', protect, getComments);
router.post('/', protect, managerOrAdminOnly, createComment);
router.delete('/:id', protect, deleteComment);

module.exports = router;
