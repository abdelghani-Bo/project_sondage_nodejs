const express = require('express');
const router = express.Router();
const pollController = require('../controllers/pollController');
const { authenticate, requireClassAdmin, requireClassMember } = require('../middlewares/authMiddleware');

router.get('/class/:classId', authenticate, requireClassMember, pollController.getClassPolls);
router.post('/class/:classId', authenticate, requireClassAdmin, pollController.createPoll);
router.post('/:pollId/vote', authenticate, pollController.votePoll);
router.post('/:pollId/toggle-status', authenticate, pollController.togglePollStatus);
router.delete('/:pollId', authenticate, pollController.deletePoll);

module.exports = router;
