const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const classRoutes = require('./classRoutes');
const pollRoutes = require('./pollRoutes');
const qaRoutes = require('./qaRoutes');
const messageRoutes = require('./messageRoutes');
const examRoutes = require('./examRoutes');

router.use('/auth', authRoutes);
router.use('/classes', classRoutes);
router.use('/polls', pollRoutes);
router.use('/qa', qaRoutes);
router.use('/messages', messageRoutes);
router.use('/exams', examRoutes);

module.exports = router;
