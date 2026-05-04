const express = require('express');
const router = express.Router();
const { getAll, create, update, remove, getMetrics, upsertMetrics } = require('../controllers/marketingController');
const { protect } = require('../middleware/auth');

// Metric routes — must be before /:id to avoid conflict
router.get('/metrics', protect, getMetrics);
router.put('/metrics/:date', protect, upsertMetrics);

// Activity routes
router.get('/', protect, getAll);
router.post('/', protect, create);
router.put('/:id', protect, update);
router.delete('/:id', protect, remove);

module.exports = router;
