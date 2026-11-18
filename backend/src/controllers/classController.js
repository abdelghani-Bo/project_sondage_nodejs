const crypto = require('crypto');
const { Class, ClassMember, User } = require('../models');
const { emitToClass } = require('../sockets/socketManager');

// Helper to generate unique alphanumeric code like CLS-89A4
function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CLS-${randomPart}`;
}

exports.createClass = async (req, res) => {
  try {
    const { name, description, subject, bannerUrl } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Le nom de la classe est requis.' });
    }

    let code = generateClassCode();
    // Ensure code uniqueness
    let attempts = 0;
    while (await Class.findOne({ where: { code } }) && attempts < 10) {
      code = generateClassCode();
      attempts++;
    }

    const inviteToken = crypto.randomBytes(16).toString('hex');

    const defaultBanners = [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1513258496099-48168024aec0?w=1200&auto=format&fit=crop&q=80'
    ];
    const selectedBanner = bannerUrl || defaultBanners[Math.floor(Math.random() * defaultBanners.length)];

    const newClass = await Class.create({
      name,
      description: description || '',
      subject: subject || 'Général',
      bannerUrl: selectedBanner,
      code,
      inviteToken,
      creatorId: req.user.id
    });

    // Add creator as Admin member
    await ClassMember.create({
      classId: newClass.id,
      userId: req.user.id,
      role: 'admin'
    });

    return res.status(201).json({
      message: 'Classe créée avec succès !',
      class: newClass
    });
  } catch (err) {
    console.error('Create class error:', err);
    return res.status(500).json({ message: 'Erreur création de classe', error: err.message });
  }
};

exports.getMyClasses = async (req, res) => {
  try {
    const memberships = await ClassMember.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Class,
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
            },
            {
              model: ClassMember,
              as: 'memberships',
              attributes: ['id', 'role', 'userId']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const classes = memberships.map(m => {
      const cls = m.Class.toJSON();
      cls.currentUserRole = m.role;
      cls.isMuted = m.isMuted;
      cls.membersCount = cls.memberships ? cls.memberships.length : 1;
      return cls;
    });

    return res.json({ classes });
  } catch (err) {
    console.error('Get my classes error:', err);
    return res.status(500).json({ message: 'Erreur récupération des classes', error: err.message });
  }
};

exports.getClassById = async (req, res) => {
  try {
    const { classId } = req.params;

    const classItem = await Class.findByPk(classId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
        },
        {
          model: ClassMember,
          as: 'memberships',
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email', 'avatarUrl']
            }
          ]
        }
      ]
    });

    if (!classItem) {
      return res.status(404).json({ message: 'Classe introuvable' });
    }

    const currentMember = classItem.memberships.find(m => m.userId === req.user.id);
    if (!currentMember) {
      return res.status(403).json({ message: 'Vous n’êtes pas membre de cette classe' });
    }

    const classData = classItem.toJSON();
    classData.currentUserRole = currentMember.role;
    classData.isMuted = currentMember.isMuted;

    return res.json({ class: classData });
  } catch (err) {
    console.error('Get class error:', err);
    return res.status(500).json({ message: 'Erreur récupération classe', error: err.message });
  }
};

exports.joinClassByCode = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Code de classe requis' });
    }

    const classItem = await Class.findOne({
      where: { code: code.trim().toUpperCase() }
    });

    if (!classItem) {
      return res.status(404).json({ message: 'Code de classe invalide' });
    }

    if (classItem.isLocked) {
      return res.status(403).json({ message: 'Les inscriptions à cette classe sont actuellement verrouillées par l’enseignant.' });
    }

    // Check if already a member
    let membership = await ClassMember.findOne({
      where: { classId: classItem.id, userId: req.user.id }
    });

    if (membership) {
      return res.json({ message: 'Vous faites déjà partie de cette classe', classId: classItem.id, role: membership.role });
    }

    membership = await ClassMember.create({
      classId: classItem.id,
      userId: req.user.id,
      role: 'member'
    });

    return res.status(201).json({
      message: `Bienvenue dans la classe "${classItem.name}" !`,
      classId: classItem.id,
      role: 'member'
    });
  } catch (err) {
    console.error('Join class error:', err);
    return res.status(500).json({ message: 'Erreur adhésion classe', error: err.message });
  }
};

exports.joinClassByToken = async (req, res) => {
  try {
    const { inviteToken } = req.params;

    const classItem = await Class.findOne({ where: { inviteToken } });
    if (!classItem) {
      return res.status(404).json({ message: 'Lien d’invitation invalide ou expiré' });
    }

    if (classItem.isLocked) {
      return res.status(403).json({ message: 'Les inscriptions sont verrouillées pour cette classe' });
    }

    let membership = await ClassMember.findOne({
      where: { classId: classItem.id, userId: req.user.id }
    });

    if (!membership) {
      membership = await ClassMember.create({
        classId: classItem.id,
        userId: req.user.id,
        role: 'member'
      });
    }

    return res.json({
      message: `Vous avez rejoint la classe "${classItem.name}"`,
      classId: classItem.id,
      role: membership.role
    });
  } catch (err) {
    console.error('Join by token error:', err);
    return res.status(500).json({ message: 'Erreur adhésion par lien', error: err.message });
  }
};

// Admin actions
exports.kickMember = async (req, res) => {
  try {
    const { classId, memberUserId } = req.params;

    const membership = await ClassMember.findOne({
      where: { classId, userId: memberUserId }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Membre introuvable dans cette classe' });
    }

    if (membership.role === 'admin') {
      return res.status(400).json({ message: 'Impossible d’exclure un administrateur' });
    }

    await membership.destroy();

    return res.json({ message: 'Membre exclu de la classe avec succès' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur exclusion membre', error: err.message });
  }
};

exports.resetClassCode = async (req, res) => {
  try {
    const { classId } = req.params;
    const classItem = await Class.findByPk(classId);

    const newCode = generateClassCode();
    const newInviteToken = crypto.randomBytes(16).toString('hex');

    classItem.code = newCode;
    classItem.inviteToken = newInviteToken;
    await classItem.save();

    return res.json({
      message: 'Code et lien d’invitation réinitialisés avec succès',
      code: newCode,
      inviteToken: newInviteToken
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur réinitialisation code', error: err.message });
  }
};

exports.toggleLockRegistrations = async (req, res) => {
  try {
    const { classId } = req.params;
    const classItem = await Class.findByPk(classId);

    classItem.isLocked = !classItem.isLocked;
    await classItem.save();

    return res.json({
      message: classItem.isLocked ? 'Inscriptions verrouillées' : 'Inscriptions ouvertes',
      isLocked: classItem.isLocked
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur verrouillage inscriptions', error: err.message });
  }
};

exports.toggleChatLock = async (req, res) => {
  try {
    const { classId } = req.params;
    const classItem = await Class.findByPk(classId);

    classItem.chatLocked = !classItem.chatLocked;
    await classItem.save();

    emitToClass(classId, 'chat_lock_toggled', { chatLocked: classItem.chatLocked });

    return res.json({
      message: classItem.chatLocked ? 'Mode silencieux activé (Chat verrouillé)' : 'Mode silencieux désactivé (Chat déverrouillé)',
      chatLocked: classItem.chatLocked
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur basculement mode silencieux', error: err.message });
  }
};

exports.toggleMemberMute = async (req, res) => {
  try {
    const { classId, memberUserId } = req.params;

    const membership = await ClassMember.findOne({
      where: { classId, userId: memberUserId }
    });

    if (!membership) {
      return res.status(404).json({ message: 'Membre introuvable' });
    }

    membership.isMuted = !membership.isMuted;
    await membership.save();

    emitToClass(classId, 'member_mute_toggled', { memberUserId: parseInt(memberUserId, 10), isMuted: membership.isMuted });

    return res.json({
      message: membership.isMuted ? 'Utilisateur mis en sourdine' : 'Utilisateur réactivé',
      isMuted: membership.isMuted
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur sourdine utilisateur', error: err.message });
  }
};
