const express = require('express');
const router = express.Router();
const { protect, approverOnly } = require('../middleware/auth');
const {
  getSaleRequests,
  createSaleRequest,
  reviewSaleRequest,
  deleteSaleRequest,
} = require('../controllers/saleRequestController');

router.use(protect);

router.route('/').get(getSaleRequests).post(createSaleRequest);
router.patch('/:id/review', approverOnly, reviewSaleRequest);
router.delete('/:id', deleteSaleRequest);

module.exports = router;
