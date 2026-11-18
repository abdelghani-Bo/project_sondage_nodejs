const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const examController = require('../controllers/examController');
const { authenticate, requireClassAdmin, requireClassMember } = require('../middlewares/authMiddleware');

// AI Question Generation (with optional PDF file upload)
router.post('/ai/generate', authenticate, upload.single('document'), examController.generateQuestionsAI);

// Exams per class
router.get('/class/:classId', authenticate, requireClassMember, examController.getClassExams);
router.post('/class/:classId', authenticate, requireClassAdmin, examController.createExam);

// Taking exam
router.get('/:examId/take', authenticate, examController.getExamForTaking);
router.post('/attempts/:attemptId/answer', authenticate, examController.submitQuestionAnswer);
router.post('/attempts/:attemptId/security-event', authenticate, examController.recordSecurityEvent);
router.post('/attempts/:attemptId/finish', authenticate, examController.finishExam);
router.get('/attempts/:attemptId/review', authenticate, examController.getMyAttemptReview);

// Teacher Analytics, Leaderboard & Export
router.get('/:examId/teacher-results', authenticate, examController.getExamResultsTeacher);
router.get('/:examId/export-csv', authenticate, examController.exportResultsCSV);

module.exports = router;
