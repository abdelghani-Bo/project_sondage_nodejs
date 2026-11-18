const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { authenticate, requireClassAdmin, requireClassMember } = require('../middlewares/authMiddleware');

// User classes & create
router.get('/', authenticate, classController.getMyClasses);
router.post('/', authenticate, classController.createClass);

// Join class
router.post('/join', authenticate, classController.joinClassByCode);
router.post('/join/token/:inviteToken', authenticate, classController.joinClassByToken);

// Class details
router.get('/:classId', authenticate, classController.getClassById);

// Admin controls
router.delete('/:classId/members/:memberUserId', authenticate, requireClassAdmin, classController.kickMember);
router.post('/:classId/reset-code', authenticate, requireClassAdmin, classController.resetClassCode);
router.post('/:classId/toggle-lock', authenticate, requireClassAdmin, classController.toggleLockRegistrations);
router.post('/:classId/toggle-chat-lock', authenticate, requireClassAdmin, classController.toggleChatLock);
router.post('/:classId/members/:memberUserId/mute', authenticate, requireClassAdmin, classController.toggleMemberMute);

module.exports = router;
