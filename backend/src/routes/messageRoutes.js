const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate, requireClassMember } = require('../middlewares/authMiddleware');

router.get('/class/:classId', authenticate, requireClassMember, messageController.getClassMessages);
router.post('/class/:classId', authenticate, requireClassMember, messageController.sendMessage);
router.post('/:messageId/reaction', authenticate, messageController.addReaction);
router.delete('/:messageId', authenticate, messageController.deleteMessage);

module.exports = router;
