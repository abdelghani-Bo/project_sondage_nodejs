const { QAQuestion, QAUpvote, User } = require('../models');
const { emitToClass } = require('../sockets/socketManager');

exports.getQuestions = async (req, res) => {
  try {
    const { classId } = req.params;

    const questions = await QAQuestion.findAll({
      where: { classId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        },
        {
          model: QAUpvote,
          as: 'upvotes',
          attributes: ['userId']
        }
      ],
      order: [
        ['isAnswered', 'ASC'],
        ['upvotesCount', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    const formatted = questions.map(q => {
      const qJson = q.toJSON();
      qJson.hasUpvoted = qJson.upvotes.some(u => u.userId === req.user.id);
      return qJson;
    });

    return res.json({ questions: formatted });
  } catch (err) {
    console.error('Get questions error:', err);
    return res.status(500).json({ message: 'Erreur chargement des questions', error: err.message });
  }
};

exports.createQuestion = async (req, res) => {
  try {
    const { classId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'La question ne peut pas être vide' });
    }

    const question = await QAQuestion.create({
      classId,
      authorId: req.user.id,
      content: content.trim(),
      upvotesCount: 0,
      isAnswered: false
    });

    const fullQuestion = await QAQuestion.findByPk(question.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        },
        {
          model: QAUpvote,
          as: 'upvotes'
        }
      ]
    });

    const qJson = fullQuestion.toJSON();
    qJson.hasUpvoted = false;

    emitToClass(classId, 'qa_question_created', { question: qJson });

    return res.status(201).json({
      message: 'Question posée avec succès',
      question: qJson
    });
  } catch (err) {
    console.error('Create question error:', err);
    return res.status(500).json({ message: 'Erreur création question', error: err.message });
  }
};

exports.toggleUpvote = async (req, res) => {
  try {
    const { questionId } = req.params;

    const question = await QAQuestion.findByPk(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question introuvable' });
    }

    const existingUpvote = await QAUpvote.findOne({
      where: { questionId, userId: req.user.id }
    });

    let hasUpvoted = false;
    if (existingUpvote) {
      // Remove upvote
      await existingUpvote.destroy();
      question.upvotesCount = Math.max(0, (question.upvotesCount || 1) - 1);
      hasUpvoted = false;
    } else {
      // Add upvote
      await QAUpvote.create({ questionId, userId: req.user.id });
      question.upvotesCount = (question.upvotesCount || 0) + 1;
      hasUpvoted = true;
    }

    await question.save();

    emitToClass(question.classId, 'qa_question_upvoted', {
      questionId: question.id,
      upvotesCount: question.upvotesCount
    });

    return res.json({
      message: hasUpvoted ? 'Upvote ajouté' : 'Upvote retiré',
      questionId: question.id,
      upvotesCount: question.upvotesCount,
      hasUpvoted
    });
  } catch (err) {
    console.error('Upvote error:', err);
    return res.status(500).json({ message: 'Erreur upvote', error: err.message });
  }
};

exports.toggleAnswered = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await QAQuestion.findByPk(questionId);

    if (!question) {
      return res.status(404).json({ message: 'Question introuvable' });
    }

    question.isAnswered = !question.isAnswered;
    await question.save();

    emitToClass(question.classId, 'qa_question_answered_toggled', {
      questionId: question.id,
      isAnswered: question.isAnswered
    });

    return res.json({
      message: question.isAnswered ? 'Question marquée comme répondue' : 'Question réouverte',
      question
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur mise à jour statut', error: err.message });
  }
};

exports.deleteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const question = await QAQuestion.findByPk(questionId);

    if (!question) {
      return res.status(404).json({ message: 'Question introuvable' });
    }

    const classId = question.classId;
    await question.destroy();

    emitToClass(classId, 'qa_question_deleted', { questionId: parseInt(questionId, 10) });

    return res.json({ message: 'Question supprimée avec succès' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur suppression', error: err.message });
  }
};
