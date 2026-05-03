const express = require('express');
const router = express.Router();
const { getPlans, createPlan, updatePlan, deletePlan } = require('../controllers/workPlanController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', getPlans);
router.post('/', createPlan);
router.patch('/:id', updatePlan);
router.delete('/:id', deletePlan);

module.exports = router;
