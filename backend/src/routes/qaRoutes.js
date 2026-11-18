const express = require('express');
const router = express.Router();
const qaController = require('../controllers/qaController');
const { authenticate, requireClassMember } = require('../middlewares/authMiddleware');

router.get('/class/:classId', authenticate, requireClassMember, qaController.getQuestions);
router.post('/class/:classId', authenticate, requireClassMember, qaController.createQuestion);
router.post('/:questionId/upvote', authenticate, qaController.toggleUpvote);
router.post('/:questionId/toggle-answered', authenticate, qaController.toggleAnswered);
router.delete('/:questionId', authenticate, qaController.deleteQuestion);

module.exports = router;
