const express = require('express');
const router = express.Router();
const {
  getPlans, createPlan, updatePlan, deletePlan,
  getSalesTeam,
  getNote, upsertNote,
  getComments, createComment, deleteComment,
} = require('../controllers/workPlanController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Static routes FIRST (before /:id)
router.get('/team', getSalesTeam);
router.get('/note', getNote);
router.patch('/note', upsertNote);
router.get('/comments', getComments);
router.post('/comments', createComment);
router.delete('/comments/:id', deleteComment);

// Plans (dynamic :id last)
router.get('/', getPlans);
router.post('/', createPlan);
router.patch('/:id', updatePlan);
router.delete('/:id', deletePlan);

module.exports = router;
