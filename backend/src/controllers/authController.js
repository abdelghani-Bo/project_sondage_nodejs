const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Class, ClassMember } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'classpulse_super_secret_jwt_key_2026_xYz987';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'classpulse_super_refresh_jwt_key_2026_aBc123';

function generateTokens(user) {
  const token = jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { token, refreshToken };
}

exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, avatarUrl } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Tous les champs obligatoires doivent être renseignés.' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(firstName + ' ' + lastName)}`,
      provider: 'local'
    });

    const { token, refreshToken } = generateTokens(user);

    return res.status(201).json({
      message: 'Compte créé avec succès !',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        provider: user.provider
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Erreur lors de l’inscription', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const { token, refreshToken } = generateTokens(user);

    return res.json({
      message: 'Connexion réussie !',
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        provider: user.provider
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Erreur lors de la connexion', error: err.message });
  }
};

// OAuth2 simulation for Google & Microsoft (as specified in 2.1)
exports.oauthLogin = async (req, res) => {
  try {
    const { provider, email, firstName, lastName, avatarUrl } = req.body;
    
    if (!['google', 'microsoft'].includes(provider)) {
      return res.status(400).json({ message: 'Fournisseur OAuth non supporté' });
    }

    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        firstName: firstName || 'Utilisateur',
        lastName: lastName || provider.toUpperCase(),
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        provider
      });
    }

    const { token, refreshToken } = generateTokens(user);

    return res.json({
      message: `Connexion réussie via ${provider.toUpperCase()}`,
      token,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        provider: user.provider
      }
    });
  } catch (err) {
    console.error('OAuth error:', err);
    return res.status(500).json({ message: 'Erreur OAuth', error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'avatarUrl', 'provider', 'createdAt']
    });

    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur profil', error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, avatarUrl, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    // Password change if requested
    if (newPassword && newPassword.trim() !== '') {
      if (user.password) {
        if (!currentPassword) {
          return res.status(400).json({ message: 'Veuillez saisir votre mot de passe actuel pour le modifier.' });
        }
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
        }
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();

    return res.json({
      message: 'Profil mis à jour avec succès',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        provider: user.provider
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur mise à jour profil', error: err.message });
  }
};
