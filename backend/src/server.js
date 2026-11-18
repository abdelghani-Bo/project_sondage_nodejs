require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');

const { sequelize, User, Class, ClassMember, Poll, PollOption, Exam, ExamQuestion, ExamQuestionOption, Message, QAQuestion } = require('./models');
const { setupSocketIO } = require('./sockets/socketManager');
const apiRoutes = require('./routes');

const app = express();
const server = http.createServer(app);

// 1. Security & Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// General Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { message: 'Trop de requêtes, veuillez réessayer ultérieurement.' }
});
app.use('/api', limiter);

// 2. Health check & API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'ClassPulse Backend API',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRoutes);

// 3. Socket.io setup
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
setupSocketIO(io);

// 4. Seed initial demo data for smooth evaluation
async function seedInitialData() {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      console.log('Seeding initial demo data for ClassPulse...');

      // Demo Teacher
      const hashedPassword = await bcrypt.hash('password123', 10);
      const teacher = await User.create({
        email: 'professeur@classpulse.fr',
        password: hashedPassword,
        firstName: 'Jean',
        lastName: 'Dupont',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        provider: 'local'
      });

      // Demo Student 1
      const student1 = await User.create({
        email: 'etudiant@classpulse.fr',
        password: hashedPassword,
        firstName: 'Alice',
        lastName: 'Moreau',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        provider: 'local'
      });

      // Demo Student 2
      const student2 = await User.create({
        email: 'thomas@classpulse.fr',
        password: hashedPassword,
        firstName: 'Thomas',
        lastName: 'Lefevre',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
        provider: 'local'
      });

      // Demo Class
      const demoClass = await Class.create({
        name: 'Master Informatique & Big Data - 2026',
        description: 'Espace officiel de cours, sondages interactifs, Q&A en direct et examens sécurisés.',
        subject: 'Architecture Web & Bases de Données',
        bannerUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
        code: 'CLS-89A4',
        inviteToken: 'demo-invite-token-89a4',
        creatorId: teacher.id,
        isLocked: false,
        chatLocked: false
      });

      // Memberships
      await ClassMember.create({ classId: demoClass.id, userId: teacher.id, role: 'admin' });
      await ClassMember.create({ classId: demoClass.id, userId: student1.id, role: 'member' });
      await ClassMember.create({ classId: demoClass.id, userId: student2.id, role: 'member' });

      // Demo Poll
      const demoPoll = await Poll.create({
        classId: demoClass.id,
        creatorId: teacher.id,
        title: 'Quelle technologie préférez-vous pour la gestion d’état côté frontend ?',
        description: 'Votez pour votre approche favorite dans les applications SPA modernes.',
        type: 'single',
        isAnonymous: false,
        resultsVisibility: 'live',
        status: 'active'
      });

      await PollOption.create({ pollId: demoPoll.id, text: 'Angular Signals', votesCount: 7, orderIndex: 0 });
      await PollOption.create({ pollId: demoPoll.id, text: 'NgRx (Redux pattern)', votesCount: 4, orderIndex: 1 });
      await PollOption.create({ pollId: demoPoll.id, text: 'RxJS BehaviorSubject', votesCount: 5, orderIndex: 2 });
      await PollOption.create({ pollId: demoPoll.id, text: 'Zustand / TanStack Store', votesCount: 2, orderIndex: 3 });

      // Demo Q&A
      await QAQuestion.create({
        classId: demoClass.id,
        authorId: student1.id,
        content: 'Est-ce que l’examen final comportera des questions sur les WebSockets et Socket.io ?',
        upvotesCount: 4,
        isAnswered: true
      });

      await QAQuestion.create({
        classId: demoClass.id,
        authorId: student2.id,
        content: 'Comment fonctionne la détection de plusieurs visages par la caméra dans le proctoring ?',
        upvotesCount: 2,
        isAnswered: false
      });

      // Demo Messages
      await Message.create({
        classId: demoClass.id,
        senderId: teacher.id,
        content: 'Bonjour à tous ! Bienvenue sur la plateforme ClassPulse. N’hésitez pas à répondre au sondage du jour et à poser vos questions.',
        reactions: JSON.stringify([{ emoji: '👋', count: 2, userIds: [student1.id, student2.id] }])
      });

      await Message.create({
        classId: demoClass.id,
        senderId: student1.id,
        content: 'Bonjour Monsieur ! Très pratique cette interface en temps réel.',
        reactions: JSON.stringify([{ emoji: '🔥', count: 1, userIds: [teacher.id] }])
      });

      // Demo Exam (QCM Sécurisé)
      const demoExam = await Exam.create({
        classId: demoClass.id,
        creatorId: teacher.id,
        title: 'Évaluation Sécurisée : Architecture Web & SQL Avancé',
        description: 'Examen chronométré (30s/question) avec surveillance webcam et détection anti-triche par changement d’onglet.',
        timePerQuestionSeconds: 30,
        randomizeQuestions: true,
        randomizeOptions: true,
        requireWebcam: true,
        maxTabSwitchWarnings: 3,
        status: 'published',
        theme: 'Bases de Données & Node.js',
        difficulty: 'Intermédiaire'
      });

      const q1 = await ExamQuestion.create({
        examId: demoExam.id,
        questionText: 'Quelle clause SQL permet de filtrer les résultats d’une fonction d’agrégation comme COUNT() ou AVG() ?',
        explanation: 'La clause HAVING s’applique après l’agrégation GROUP BY, tandis que WHERE s’applique avant.',
        points: 100,
        orderIndex: 0
      });
      await ExamQuestionOption.create({ questionId: q1.id, optionText: 'HAVING', isCorrect: true, orderIndex: 0 });
      await ExamQuestionOption.create({ questionId: q1.id, optionText: 'WHERE', isCorrect: false, orderIndex: 1 });
      await ExamQuestionOption.create({ questionId: q1.id, optionText: 'ORDER BY', isCorrect: false, orderIndex: 2 });
      await ExamQuestionOption.create({ questionId: q1.id, optionText: 'GROUP FILTER', isCorrect: false, orderIndex: 3 });

      const q2 = await ExamQuestion.create({
        examId: demoExam.id,
        questionText: 'Pourquoi utilise-t-on des requêtes préparées (Prepared Statements) avec MySQL ?',
        explanation: 'Les requêtes préparées séparent les données de l’instruction SQL, neutralisant ainsi les attaques par injection SQL.',
        points: 100,
        orderIndex: 1
      });
      await ExamQuestionOption.create({ questionId: q2.id, optionText: 'Pour neutraliser définitivement les injections SQL', isCorrect: true, orderIndex: 0 });
      await ExamQuestionOption.create({ questionId: q2.id, optionText: 'Pour doubler la taille mémoire du cache', isCorrect: false, orderIndex: 1 });
      await ExamQuestionOption.create({ questionId: q2.id, optionText: 'Pour chiffrer le code source client', isCorrect: false, orderIndex: 2 });
      await ExamQuestionOption.create({ questionId: q2.id, optionText: 'Pour obliger l’utilisation de websockets', isCorrect: false, orderIndex: 3 });

      const q3 = await ExamQuestion.create({
        examId: demoExam.id,
        questionText: 'En Socket.io, quel concept permet d’isoler la diffusion des messages à un groupe d’utilisateurs précis ?',
        explanation: 'Les "Rooms" permettent de regrouper des sockets pour cibler des diffusions spécifiques (comme une classe isolée).',
        points: 100,
        orderIndex: 2
      });
      await ExamQuestionOption.create({ questionId: q3.id, optionText: 'Les "Rooms" (salons)', isCorrect: true, orderIndex: 0 });
      await ExamQuestionOption.create({ questionId: q3.id, optionText: 'Les Threads systèmes', isCorrect: false, orderIndex: 1 });
      await ExamQuestionOption.create({ questionId: q3.id, optionText: 'Les Cookies HTTPOnly', isCorrect: false, orderIndex: 2 });
      await ExamQuestionOption.create({ questionId: q3.id, optionText: 'Les Service Workers', isCorrect: false, orderIndex: 3 });

      console.log('Seed completed successfully!');
    }
  } catch (err) {
    console.warn('Seed data notice:', err.message);
  }
}

// 5. Database Connection and Server Startup
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('MySQL Database connected successfully!');

    // Sync schema with database
    await sequelize.sync({ alter: true });
    console.log('All Sequelize models synchronized with MySQL!');

    await seedInitialData();

    server.listen(PORT, () => {
      console.log(`ClassPulse Server running at http://localhost:${PORT}`);
      console.log(`Socket.io ready on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
  }
}

startServer();
