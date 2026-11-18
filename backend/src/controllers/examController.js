const { Exam, ExamQuestion, ExamQuestionOption, ExamAttempt, ExamAnswer, ProctorAlert, User, Class } = require('../models');
const { generateQuizWithAI, extractTextFromPDF, generatePersonalizedFeedback } = require('../services/aiService');
const { emitToExamMonitor } = require('../sockets/socketManager');

// Shuffle array helper for randomization
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 1. AI Generation endpoint
exports.generateQuestionsAI = async (req, res) => {
  try {
    const { theme, difficulty, count } = req.body;
    let textContent = req.body.textContent || '';

    // If PDF file was uploaded via multer
    if (req.file) {
      const pdfText = await extractTextFromPDF(req.file.buffer);
      if (pdfText) {
        textContent = (textContent ? textContent + '\n' : '') + pdfText;
      }
    }

    const questions = await generateQuizWithAI({
      theme: theme || 'Général',
      difficulty: difficulty || 'Intermédiaire',
      textContent,
      count: parseInt(count, 10) || 5
    });

    return res.json({
      message: 'Questions générées par l’IA avec succès !',
      questions
    });
  } catch (err) {
    console.error('AI generation error:', err);
    return res.status(500).json({ message: 'Erreur lors de la génération IA', error: err.message });
  }
};

// 2. Create and publish Exam
exports.createExam = async (req, res) => {
  try {
    const { classId } = req.params;
    const {
      title,
      description,
      timePerQuestionSeconds,
      randomizeQuestions,
      randomizeOptions,
      requireWebcam,
      maxTabSwitchWarnings,
      theme,
      difficulty,
      questions
    } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'Titre et au moins une question requis pour créer un examen' });
    }

    const exam = await Exam.create({
      classId,
      creatorId: req.user.id,
      title,
      description: description || '',
      timePerQuestionSeconds: parseInt(timePerQuestionSeconds, 10) || 30,
      randomizeQuestions: randomizeQuestions !== false,
      randomizeOptions: randomizeOptions !== false,
      requireWebcam: requireWebcam !== false,
      maxTabSwitchWarnings: parseInt(maxTabSwitchWarnings, 10) || 3,
      theme: theme || '',
      difficulty: difficulty || 'Intermédiaire',
      status: 'published'
    });

    for (let qIdx = 0; qIdx < questions.length; qIdx++) {
      const q = questions[qIdx];
      const examQ = await ExamQuestion.create({
        examId: exam.id,
        questionText: q.questionText,
        explanation: q.explanation || '',
        points: parseInt(q.points, 10) || 100,
        orderIndex: qIdx
      });

      if (q.options && Array.isArray(q.options)) {
        for (let oIdx = 0; oIdx < q.options.length; oIdx++) {
          const opt = q.options[oIdx];
          await ExamQuestionOption.create({
            questionId: examQ.id,
            optionText: typeof opt === 'string' ? opt : opt.text || opt.optionText,
            isCorrect: Boolean(opt.isCorrect),
            orderIndex: oIdx
          });
        }
      }
    }

    const fullExam = await Exam.findByPk(exam.id, {
      include: [
        {
          model: ExamQuestion,
          as: 'questions',
          include: [{ model: ExamQuestionOption, as: 'options' }]
        }
      ]
    });

    return res.status(201).json({
      message: 'Examen créé et publié avec succès !',
      exam: fullExam
    });
  } catch (err) {
    console.error('Create exam error:', err);
    return res.status(500).json({ message: 'Erreur création examen', error: err.message });
  }
};

// 3. Get Class Exams list
exports.getClassExams = async (req, res) => {
  try {
    const { classId } = req.params;

    const exams = await Exam.findAll({
      where: { classId },
      include: [
        {
          model: ExamQuestion,
          as: 'questions',
          attributes: ['id', 'points']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName']
        },
        {
          model: ExamAttempt,
          as: 'attempts',
          where: { userId: req.user.id },
          required: false,
          attributes: ['id', 'score', 'status', 'correctAnswersCount', 'totalQuestions', 'tabSwitchCount', 'submittedAt']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const formatted = exams.map(e => {
      const eJson = e.toJSON();
      eJson.totalQuestions = eJson.questions ? eJson.questions.length : 0;
      eJson.myAttempt = (eJson.attempts && eJson.attempts.length > 0) ? eJson.attempts[0] : null;
      delete eJson.questions;
      delete eJson.attempts;
      return eJson;
    });

    return res.json({ exams: formatted });
  } catch (err) {
    console.error('Get exams error:', err);
    return res.status(500).json({ message: 'Erreur chargement examens', error: err.message });
  }
};

// 4. Get Exam for student / taking exam
exports.getExamForTaking = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findByPk(examId, {
      include: [
        {
          model: ExamQuestion,
          as: 'questions',
          include: [
            {
              model: ExamQuestionOption,
              as: 'options',
              attributes: ['id', 'optionText', 'orderIndex'] // HIDE isCorrect from student during test!
            }
          ]
        }
      ]
    });

    if (!exam) {
      return res.status(404).json({ message: 'Examen introuvable' });
    }

    // Check if student already finished
    let attempt = await ExamAttempt.findOne({
      where: { examId: exam.id, userId: req.user.id }
    });

    if (attempt && (attempt.status === 'completed' || attempt.status === 'disqualified_anti_cheat')) {
      return res.status(400).json({
        message: 'Vous avez déjà passé cet examen',
        alreadyCompleted: true,
        attemptId: attempt.id
      });
    }

    if (!attempt) {
      attempt = await ExamAttempt.create({
        examId: exam.id,
        userId: req.user.id,
        status: 'in_progress',
        totalQuestions: exam.questions.length,
        startedAt: new Date()
      });
    }

    const examData = exam.toJSON();

    // Randomize questions if configured
    if (exam.randomizeQuestions) {
      examData.questions = shuffleArray(examData.questions);
    }

    // Randomize options if configured
    if (exam.randomizeOptions) {
      examData.questions.forEach(q => {
        q.options = shuffleArray(q.options);
      });
    }

    // Exclude pedagogic explanations during live test
    examData.questions.forEach(q => {
      delete q.explanation;
    });

    return res.json({
      exam: examData,
      attempt: {
        id: attempt.id,
        tabSwitchCount: attempt.tabSwitchCount,
        status: attempt.status,
        startedAt: attempt.startedAt
      }
    });
  } catch (err) {
    console.error('Get exam for taking error:', err);
    return res.status(500).json({ message: 'Erreur préparation examen', error: err.message });
  }
};

// 5. Submit individual question answer (Ephemeral flow)
exports.submitQuestionAnswer = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedOptionId, timeSpentSeconds } = req.body;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [{ model: Exam, as: 'Exam' }]
    });

    if (!attempt || attempt.userId !== req.user.id) {
      return res.status(403).json({ message: 'Tentative d’examen invalide' });
    }

    if (attempt.status !== 'in_progress') {
      return res.status(400).json({ message: 'Cet examen est déjà clôturé' });
    }

    let isCorrect = false;
    let earnedPoints = 0;

    if (selectedOptionId) {
      const option = await ExamQuestionOption.findByPk(selectedOptionId);
      if (option && option.isCorrect) {
        isCorrect = true;
        const question = await ExamQuestion.findByPk(questionId);
        const basePoints = question ? question.points : 100;
        
        // Gamification bonus: faster answers earn higher points
        const maxTime = attempt.Exam ? attempt.Exam.timePerQuestionSeconds : 30;
        const timeFactor = Math.max(0.5, 1 - (timeSpentSeconds / (maxTime * 1.5)));
        earnedPoints = Math.round(basePoints * timeFactor);
      }
    }

    // Save answer
    await ExamAnswer.create({
      attemptId: attempt.id,
      questionId,
      selectedOptionId: selectedOptionId || null,
      isCorrect,
      timeSpentSeconds: timeSpentSeconds || 0
    });

    if (isCorrect) {
      attempt.correctAnswersCount = (attempt.correctAnswersCount || 0) + 1;
      attempt.score = (attempt.score || 0) + earnedPoints;
      await attempt.save();
    }

    return res.json({
      message: 'Réponse enregistrée',
      isCorrect,
      earnedPoints
    });
  } catch (err) {
    console.error('Submit question answer error:', err);
    return res.status(500).json({ message: 'Erreur validation réponse', error: err.message });
  }
};

// 6. Record Anti-Cheat event (Anti-Tab Switch or Proctoring alert)
exports.recordSecurityEvent = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { type, details, snapshotUrl } = req.body;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [{ model: Exam, as: 'Exam' }]
    });

    if (!attempt || attempt.userId !== req.user.id) {
      return res.status(403).json({ message: 'Tentative invalide' });
    }

    // Save proctor alert
    const newAlert = await ProctorAlert.create({
      examId: attempt.examId,
      attemptId: attempt.id,
      userId: req.user.id,
      type: type || 'tab_switch',
      details: details || '',
      snapshotUrl: snapshotUrl || null
    });

    emitToExamMonitor(attempt.examId, 'proctor_alert_received', {
      alert: newAlert,
      student: {
        id: req.user.id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email
      }
    });

    if (type === 'tab_switch' || type === 'fullscreen_exit') {
      attempt.tabSwitchCount = (attempt.tabSwitchCount || 0) + 1;
    } else {
      attempt.proctorSuspicionCount = (attempt.proctorSuspicionCount || 0) + 1;
    }

    const maxWarnings = attempt.Exam ? attempt.Exam.maxTabSwitchWarnings : 3;
    let autoDisqualified = false;

    if (attempt.tabSwitchCount >= maxWarnings) {
      attempt.status = 'disqualified_anti_cheat';
      attempt.submittedAt = new Date();
      attempt.feedback = 'Disqualification automatique pour dépassement du nombre maximal d’avertissements de sortie d’onglet ou perte de focus.';
      autoDisqualified = true;
    }

    await attempt.save();

    return res.json({
      message: 'Événement de surveillance enregistré',
      tabSwitchCount: attempt.tabSwitchCount,
      warningsRemaining: Math.max(0, maxWarnings - attempt.tabSwitchCount),
      autoDisqualified
    });
  } catch (err) {
    console.error('Security event error:', err);
    return res.status(500).json({ message: 'Erreur événement sécurité', error: err.message });
  }
};

// 7. Finish Exam & Generate AI Personalized Feedback
exports.finishExam = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [
        {
          model: Exam,
          as: 'Exam',
          include: [
            {
              model: ExamQuestion,
              as: 'questions',
              include: [{ model: ExamQuestionOption, as: 'options' }]
            }
          ]
        },
        {
          model: ExamAnswer,
          as: 'answers',
          include: [
            { model: ExamQuestion, as: 'question' },
            { model: ExamQuestionOption, as: 'selectedOption' }
          ]
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'firstName', 'lastName']
        }
      ]
    });

    if (!attempt || attempt.userId !== req.user.id) {
      return res.status(403).json({ message: 'Tentative invalide' });
    }

    if (attempt.status !== 'disqualified_anti_cheat') {
      attempt.status = 'completed';
    }
    attempt.submittedAt = new Date();

    const totalQuestions = attempt.Exam ? attempt.Exam.questions.length : 1;
    const correctAnswers = attempt.answers ? attempt.answers.filter(a => a.isCorrect).length : 0;
    attempt.totalQuestions = totalQuestions;
    attempt.correctAnswersCount = correctAnswers;

    // Identify missed topics for AI feedback
    const missedTopics = [];
    if (attempt.answers) {
      attempt.answers.filter(a => !a.isCorrect).forEach(a => {
        if (a.question) {
          missedTopics.push(a.question.questionText.substring(0, 50));
        }
      });
    }

    // Generate personalized AI explanation & feedback
    const studentName = attempt.student ? `${attempt.student.firstName} ${attempt.student.lastName}` : 'Étudiant';
    const examTitle = attempt.Exam ? attempt.Exam.title : 'Examen';

    const aiFeedback = await generatePersonalizedFeedback({
      studentName,
      examTitle,
      score: attempt.score,
      totalQuestions,
      correctCount: correctAnswers,
      tabSwitches: attempt.tabSwitchCount,
      suspiciousAlerts: attempt.proctorSuspicionCount,
      missedTopics
    });

    attempt.feedback = aiFeedback;
    await attempt.save();

    return res.json({
      message: 'Examen soumis avec succès !',
      attempt: {
        id: attempt.id,
        score: attempt.score,
        totalQuestions: attempt.totalQuestions,
        correctAnswersCount: attempt.correctAnswersCount,
        tabSwitchCount: attempt.tabSwitchCount,
        proctorSuspicionCount: attempt.proctorSuspicionCount,
        status: attempt.status,
        feedback: attempt.feedback,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (err) {
    console.error('Finish exam error:', err);
    return res.status(500).json({ message: 'Erreur clôture examen', error: err.message });
  }
};

// 8. Teacher Results, Proctoring Dashboard & Gamification Leaderboard
exports.getExamResultsTeacher = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findByPk(examId, {
      include: [
        {
          model: ExamQuestion,
          as: 'questions',
          include: [{ model: ExamQuestionOption, as: 'options' }]
        },
        {
          model: ExamAttempt,
          as: 'attempts',
          include: [
            {
              model: User,
              as: 'student',
              attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
            },
            {
              model: ProctorAlert,
              as: 'alerts'
            },
            {
              model: ExamAnswer,
              as: 'answers',
              include: [
                { model: ExamQuestion, as: 'question' },
                { model: ExamQuestionOption, as: 'selectedOption' }
              ]
            }
          ]
        }
      ]
    });

    if (!exam) {
      return res.status(404).json({ message: 'Examen introuvable' });
    }

    // Sort leaderboard by score desc, then by tabSwitchCount asc
    const attempts = [...exam.attempts].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.tabSwitchCount - b.tabSwitchCount;
    });

    const leaderboard = attempts.map((att, rank) => ({
      rank: rank + 1,
      attemptId: att.id,
      student: att.student,
      score: att.score,
      correctCount: att.correctAnswersCount,
      totalQuestions: att.totalQuestions,
      percentage: Math.round(((att.correctAnswersCount || 0) / (att.totalQuestions || 1)) * 100),
      tabSwitches: att.tabSwitchCount,
      alertsCount: att.alerts ? att.alerts.length : 0,
      status: att.status,
      submittedAt: att.submittedAt
    }));

    return res.json({
      exam: {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        timePerQuestionSeconds: exam.timePerQuestionSeconds,
        totalQuestions: exam.questions.length,
        questions: exam.questions
      },
      leaderboard,
      attempts
    });
  } catch (err) {
    console.error('Teacher results error:', err);
    return res.status(500).json({ message: 'Erreur chargement résultats enseignant', error: err.message });
  }
};

// 9. Student Review (Detailed view of their own attempt with answers & explanations)
exports.getMyAttemptReview = async (req, res) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [
        {
          model: Exam,
          as: 'Exam',
          include: [
            {
              model: ExamQuestion,
              as: 'questions',
              include: [{ model: ExamQuestionOption, as: 'options' }]
            }
          ]
        },
        {
          model: ExamAnswer,
          as: 'answers',
          include: [
            { model: ExamQuestion, as: 'question' },
            { model: ExamQuestionOption, as: 'selectedOption' }
          ]
        }
      ]
    });

    if (!attempt || attempt.userId !== req.user.id) {
      return res.status(403).json({ message: 'Accès non autorisé à cette tentative' });
    }

    return res.json({ attempt });
  } catch (err) {
    console.error('Review error:', err);
    return res.status(500).json({ message: 'Erreur révision examen', error: err.message });
  }
};

// 10. Export Results (CSV format as specified in Section 3)
exports.exportResultsCSV = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findByPk(examId, {
      include: [
        {
          model: ExamAttempt,
          as: 'attempts',
          include: [{ model: User, as: 'student' }]
        }
      ]
    });

    if (!exam) {
      return res.status(404).json({ message: 'Examen introuvable' });
    }

    let csv = 'Rang,Nom,Prenom,Email,Score,Reponses Correctes,Total Questions,Pourcentage,Sorties Onglet,Statut,Date Soumission\n';

    const sorted = [...exam.attempts].sort((a, b) => b.score - a.score);
    sorted.forEach((att, idx) => {
      const percentage = Math.round(((att.correctAnswersCount || 0) / (att.totalQuestions || 1)) * 100);
      csv += `${idx + 1},"${att.student?.lastName || ''}","${att.student?.firstName || ''}","${att.student?.email || ''}",${att.score},${att.correctAnswersCount},${att.totalQuestions},${percentage}%,${att.tabSwitchCount},"${att.status}","${att.submittedAt ? new Date(att.submittedAt).toLocaleString('fr-FR') : 'Non soumis'}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="resultats_examen_${exam.id}.csv"`);
    return res.send('\uFEFF' + csv); // Include BOM for Excel French UTF-8 support
  } catch (err) {
    return res.status(500).json({ message: 'Erreur export CSV', error: err.message });
  }
};
