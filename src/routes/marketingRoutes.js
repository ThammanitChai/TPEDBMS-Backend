const express = require('express');
const router = express.Router();
const { getAll, create, update, remove } = require('../controllers/marketingController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAll);
router.post('/', protect, create);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);

module.exports = router;
