const express = require('express');
const router = express.Router();
const { getAll, getDealStats, create, update, remove } = require('../controllers/dealController');
const { protect } = require('../middleware/auth');

router.get('/stats', protect, getDealStats);
router.get('/', protect, getAll);
router.post('/', protect, create);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);

module.exports = router;
