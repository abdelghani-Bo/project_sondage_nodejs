const { Message, Class, ClassMember, User } = require('../models');
const { emitToClass } = require('../sockets/socketManager');

exports.getClassMessages = async (req, res) => {
  try {
    const { classId } = req.params;

    const messages = await Message.findAll({
      where: { classId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        }
      ],
      order: [['createdAt', 'ASC']],
      limit: 150
    });

    const parsedMessages = messages.map(m => {
      const mJson = m.toJSON();
      try {
        mJson.reactions = JSON.parse(mJson.reactions || '[]');
      } catch (e) {
        mJson.reactions = [];
      }
      return mJson;
    });

    return res.json({ messages: parsedMessages });
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ message: 'Erreur chargement messages', error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { classId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Le message ne peut pas être vide' });
    }

    const classItem = await Class.findByPk(classId);
    if (!classItem) {
      return res.status(404).json({ message: 'Classe introuvable' });
    }

    // Check member role & mute status
    const membership = await ClassMember.findOne({
      where: { classId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Vous ne faites pas partie de cette classe' });
    }

    const isAdmin = membership.role === 'admin';

    // Check if chat is locked (only admin can post if locked)
    if (classItem.chatLocked && !isAdmin) {
      return res.status(403).json({ message: 'Le chat est verrouillé par l’enseignant (Mode silencieux actif)' });
    }

    // Check if user is muted
    if (membership.isMuted && !isAdmin) {
      return res.status(403).json({ message: 'Vous avez été mis en sourdine par le modérateur' });
    }

    const message = await Message.create({
      classId,
      senderId: req.user.id,
      content: content.trim(),
      reactions: '[]',
      isDeleted: false
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        }
      ]
    });

    const mJson = fullMessage.toJSON();
    mJson.reactions = [];

    emitToClass(classId, 'chat_message_received', { chatMessage: mJson });

    return res.status(201).json({
      message: 'Message envoyé',
      chatMessage: mJson
    });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ message: 'Erreur envoi message', error: err.message });
  }
};

exports.addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({ message: 'Emoji requis' });
    }

    const msg = await Message.findByPk(messageId, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        }
      ]
    });

    if (!msg) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    let reactions = [];
    try {
      reactions = JSON.parse(msg.reactions || '[]');
    } catch (e) {
      reactions = [];
    }

    let existingReaction = reactions.find(r => r.emoji === emoji);
    const userId = req.user.id;

    if (existingReaction) {
      if (!existingReaction.userIds.includes(userId)) {
        existingReaction.userIds.push(userId);
        existingReaction.count = existingReaction.userIds.length;
      } else {
        // Toggle off
        existingReaction.userIds = existingReaction.userIds.filter(id => id !== userId);
        existingReaction.count = existingReaction.userIds.length;
      }
    } else {
      reactions.push({
        emoji,
        count: 1,
        userIds: [userId]
      });
    }

    // Filter out zero count
    reactions = reactions.filter(r => r.count > 0);

    msg.reactions = JSON.stringify(reactions);
    await msg.save();

    const mJson = msg.toJSON();
    mJson.reactions = reactions;

    emitToClass(msg.classId, 'chat_reaction_updated', {
      messageId: msg.id,
      reactions: reactions
    });

    return res.json({
      message: 'Réaction mise à jour',
      chatMessage: mJson
    });
  } catch (err) {
    console.error('Reaction error:', err);
    return res.status(500).json({ message: 'Erreur réaction', error: err.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const msg = await Message.findByPk(messageId);

    if (!msg) {
      return res.status(404).json({ message: 'Message introuvable' });
    }

    // Soft delete or hide message
    msg.isDeleted = true;
    msg.content = 'Ce message a été supprimé par la modération.';
    await msg.save();

    emitToClass(msg.classId, 'chat_message_deleted', { messageId: msg.id });

    return res.json({ message: 'Message supprimé', messageId: msg.id });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur suppression message', error: err.message });
  }
};
