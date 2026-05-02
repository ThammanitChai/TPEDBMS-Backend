const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getSales,
  createSale,
  updateSale,
  deleteSale,
  getSaleStats,
} = require('../controllers/saleController');

router.use(protect);

router.get('/stats', getSaleStats);
router.route('/').get(getSales).post(createSale);
router.route('/:id').put(updateSale).delete(deleteSale);

module.exports = router;
