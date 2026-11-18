const jwt = require('jsonwebtoken');
const { User, ClassMember } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'classpulse_super_secret_jwt_key_2026_xYz987';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentification requise (Token manquant)' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl', 'provider']
    });

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token invalide ou expiré', error: err.message });
  }
};

// Check if user is admin in the class
const requireClassAdmin = async (req, res, next) => {
  try {
    const classId = req.params.classId || req.body.classId;
    if (!classId) {
      return res.status(400).json({ message: 'ID de classe manquant' });
    }

    const membership = await ClassMember.findOne({
      where: { classId, userId: req.user.id }
    });

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ message: 'Action réservée au professeur/administrateur de cette classe' });
    }

    req.membership = membership;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Erreur vérification droits classe', error: err.message });
  }
};

// Check if user is member (or admin) in the class
const requireClassMember = async (req, res, next) => {
  try {
    const classId = req.params.classId || req.body.classId;
    if (!classId) {
      return res.status(400).json({ message: 'ID de classe manquant' });
    }

    const membership = await ClassMember.findOne({
      where: { classId, userId: req.user.id }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Vous devez rejoindre cette classe pour y accéder' });
    }

    req.membership = membership;
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Erreur vérification adhésion classe', error: err.message });
  }
};

module.exports = {
  authenticate,
  requireClassAdmin,
  requireClassMember
};
