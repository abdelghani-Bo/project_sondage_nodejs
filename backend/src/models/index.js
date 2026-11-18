const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// 1. User Model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // Can be null if OAuth login
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  avatarUrl: {
    type: DataTypes.TEXT('long'),
    defaultValue: null
  },
  provider: {
    type: DataTypes.ENUM('local', 'google', 'microsoft'),
    defaultValue: 'local'
  }
}, {
  timestamps: true
});

// 2. Class Model
const Class = sequelize.define('Class', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(16),
    allowNull: false,
    unique: true
  },
  inviteToken: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  subject: {
    type: DataTypes.STRING,
    defaultValue: 'Général'
  },
  bannerUrl: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  isLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  chatLocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

// 3. ClassMember Model
const ClassMember = sequelize.define('ClassMember', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member'
  },
  isMuted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mutedUntil: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

// 4. Poll Model
const Poll = sequelize.define('Poll', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  type: {
    type: DataTypes.ENUM('single', 'multiple'),
    defaultValue: 'single'
  },
  isAnonymous: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  resultsVisibility: {
    type: DataTypes.ENUM('live', 'after_close'),
    defaultValue: 'live'
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'closed'),
    defaultValue: 'active'
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

// 5. PollOption Model
const PollOption = sequelize.define('PollOption', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  text: {
    type: DataTypes.STRING,
    allowNull: false
  },
  votesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: false
});

// 6. PollVote Model
const PollVote = sequelize.define('PollVote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  voterIdentifier: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true
});

// 7. QAQuestion Model
const QAQuestion = sequelize.define('QAQuestion', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  upvotesCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isAnswered: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true
});

// 8. QAUpvote Model
const QAUpvote = sequelize.define('QAUpvote', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  }
}, {
  timestamps: true
});

// 9. Message Model
const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  reactions: {
    type: DataTypes.TEXT, // JSON stringified array of { emoji: '👍', count: 1, userIds: [1] }
    defaultValue: '[]'
  }
}, {
  timestamps: true
});

// 10. Exam Model
const Exam = sequelize.define('Exam', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  timePerQuestionSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 30
  },
  randomizeQuestions: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  randomizeOptions: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  requireWebcam: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  maxTabSwitchWarnings: {
    type: DataTypes.INTEGER,
    defaultValue: 3
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'active', 'ended'),
    defaultValue: 'published'
  },
  theme: {
    type: DataTypes.STRING,
    defaultValue: ''
  },
  difficulty: {
    type: DataTypes.STRING,
    defaultValue: 'Intermédiaire'
  },
  sourceMaterial: {
    type: DataTypes.TEXT('long'),
    defaultValue: ''
  }
}, {
  timestamps: true
});

// 11. ExamQuestion Model
const ExamQuestion = sequelize.define('ExamQuestion', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  questionText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  explanation: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: false
});

// 12. ExamQuestionOption Model
const ExamQuestionOption = sequelize.define('ExamQuestionOption', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  optionText: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  orderIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: false
});

// 13. ExamAttempt Model
const ExamAttempt = sequelize.define('ExamAttempt', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  score: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  correctAnswersCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  tabSwitchCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  proctorSuspicionCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'disqualified_anti_cheat'),
    defaultValue: 'in_progress'
  },
  feedback: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  startedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true
});

// 14. ExamAnswer Model
const ExamAnswer = sequelize.define('ExamAnswer', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  isCorrect: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  timeSpentSeconds: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  timestamps: true
});

// 15. ProctorAlert Model
const ProctorAlert = sequelize.define('ProctorAlert', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('no_face', 'multiple_faces', 'tab_switch', 'fullscreen_exit', 'suspicious_movement'),
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT,
    defaultValue: ''
  },
  snapshotUrl: {
    type: DataTypes.TEXT('long'),
    allowNull: true
  }
}, {
  timestamps: true
});

// Associations
// User & Class
User.hasMany(Class, { foreignKey: 'creatorId', as: 'createdClasses' });
Class.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

User.belongsToMany(Class, { through: ClassMember, foreignKey: 'userId', as: 'joinedClasses' });
Class.belongsToMany(User, { through: ClassMember, foreignKey: 'classId', as: 'members' });

Class.hasMany(ClassMember, { foreignKey: 'classId', as: 'memberships' });
ClassMember.belongsTo(Class, { foreignKey: 'classId' });
ClassMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Polls
Class.hasMany(Poll, { foreignKey: 'classId', as: 'polls' });
Poll.belongsTo(Class, { foreignKey: 'classId' });
User.hasMany(Poll, { foreignKey: 'creatorId' });
Poll.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

Poll.hasMany(PollOption, { foreignKey: 'pollId', as: 'options', onDelete: 'CASCADE' });
PollOption.belongsTo(Poll, { foreignKey: 'pollId' });

Poll.hasMany(PollVote, { foreignKey: 'pollId', as: 'votes', onDelete: 'CASCADE' });
PollVote.belongsTo(Poll, { foreignKey: 'pollId' });

PollOption.hasMany(PollVote, { foreignKey: 'pollOptionId', as: 'votes', onDelete: 'CASCADE' });
PollVote.belongsTo(PollOption, { foreignKey: 'pollOptionId', as: 'option' });

User.hasMany(PollVote, { foreignKey: 'userId' });
PollVote.belongsTo(User, { foreignKey: 'userId', as: 'voter' });

// Q&A
Class.hasMany(QAQuestion, { foreignKey: 'classId', as: 'qaQuestions' });
QAQuestion.belongsTo(Class, { foreignKey: 'classId' });
User.hasMany(QAQuestion, { foreignKey: 'authorId' });
QAQuestion.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

QAQuestion.hasMany(QAUpvote, { foreignKey: 'questionId', as: 'upvotes', onDelete: 'CASCADE' });
QAUpvote.belongsTo(QAQuestion, { foreignKey: 'questionId' });
User.hasMany(QAUpvote, { foreignKey: 'userId' });
QAUpvote.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Messages (Chat)
Class.hasMany(Message, { foreignKey: 'classId', as: 'messages' });
Message.belongsTo(Class, { foreignKey: 'classId' });
User.hasMany(Message, { foreignKey: 'senderId' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

// Exams
Class.hasMany(Exam, { foreignKey: 'classId', as: 'exams' });
Exam.belongsTo(Class, { foreignKey: 'classId' });
User.hasMany(Exam, { foreignKey: 'creatorId' });
Exam.belongsTo(User, { foreignKey: 'creatorId', as: 'creator' });

Exam.hasMany(ExamQuestion, { foreignKey: 'examId', as: 'questions', onDelete: 'CASCADE' });
ExamQuestion.belongsTo(Exam, { foreignKey: 'examId' });

ExamQuestion.hasMany(ExamQuestionOption, { foreignKey: 'questionId', as: 'options', onDelete: 'CASCADE' });
ExamQuestionOption.belongsTo(ExamQuestion, { foreignKey: 'questionId' });

Exam.hasMany(ExamAttempt, { foreignKey: 'examId', as: 'attempts', onDelete: 'CASCADE' });
ExamAttempt.belongsTo(Exam, { foreignKey: 'examId' });
User.hasMany(ExamAttempt, { foreignKey: 'userId', as: 'examAttempts' });
ExamAttempt.belongsTo(User, { foreignKey: 'userId', as: 'student' });

ExamAttempt.hasMany(ExamAnswer, { foreignKey: 'attemptId', as: 'answers', onDelete: 'CASCADE' });
ExamAnswer.belongsTo(ExamAttempt, { foreignKey: 'attemptId' });
ExamQuestion.hasMany(ExamAnswer, { foreignKey: 'questionId' });
ExamAnswer.belongsTo(ExamQuestion, { foreignKey: 'questionId', as: 'question' });
ExamQuestionOption.hasMany(ExamAnswer, { foreignKey: 'selectedOptionId' });
ExamAnswer.belongsTo(ExamQuestionOption, { foreignKey: 'selectedOptionId', as: 'selectedOption' });

Exam.hasMany(ProctorAlert, { foreignKey: 'examId', as: 'proctorAlerts', onDelete: 'CASCADE' });
ProctorAlert.belongsTo(Exam, { foreignKey: 'examId' });
ExamAttempt.hasMany(ProctorAlert, { foreignKey: 'attemptId', as: 'alerts', onDelete: 'CASCADE' });
ProctorAlert.belongsTo(ExamAttempt, { foreignKey: 'attemptId' });
User.hasMany(ProctorAlert, { foreignKey: 'userId' });
ProctorAlert.belongsTo(User, { foreignKey: 'userId', as: 'student' });

module.exports = {
  sequelize,
  User,
  Class,
  ClassMember,
  Poll,
  PollOption,
  PollVote,
  QAQuestion,
  QAUpvote,
  Message,
  Exam,
  ExamQuestion,
  ExamQuestionOption,
  ExamAttempt,
  ExamAnswer,
  ProctorAlert
};
