const { Poll, PollOption, PollVote, User } = require('../models');
const { emitToClass } = require('../sockets/socketManager');

exports.createPoll = async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description, type, isAnonymous, resultsVisibility, options } = req.body;

    if (!title || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ message: 'Titre et au moins 2 options requis' });
    }

    const poll = await Poll.create({
      classId,
      creatorId: req.user.id,
      title,
      description: description || '',
      type: type === 'multiple' ? 'multiple' : 'single',
      isAnonymous: Boolean(isAnonymous),
      resultsVisibility: resultsVisibility === 'after_close' ? 'after_close' : 'live',
      status: 'active'
    });

    const createdOptions = await Promise.all(
      options.map((optText, index) =>
        PollOption.create({
          pollId: poll.id,
          text: typeof optText === 'string' ? optText : optText.text,
          votesCount: 0,
          orderIndex: index
        })
      )
    );

    const fullPoll = await Poll.findByPk(poll.id, {
      include: [
        { model: PollOption, as: 'options' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    emitToClass(classId, 'poll_created', { poll: fullPoll });

    return res.status(201).json({
      message: 'Sondage créé avec succès !',
      poll: fullPoll
    });
  } catch (err) {
    console.error('Create poll error:', err);
    return res.status(500).json({ message: 'Erreur création sondage', error: err.message });
  }
};

exports.getClassPolls = async (req, res) => {
  try {
    const { classId } = req.params;

    const polls = await Poll.findAll({
      where: { classId },
      include: [
        {
          model: PollOption,
          as: 'options'
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName', 'avatarUrl']
        },
        {
          model: PollVote,
          as: 'votes',
          where: { userId: req.user.id },
          required: false,
          attributes: ['id', 'pollOptionId']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Format poll data and check if user has voted
    const formatted = polls.map(p => {
      const pJson = p.toJSON();
      const userVotes = pJson.votes || [];
      pJson.hasVoted = userVotes.length > 0;
      pJson.mySelectedOptionIds = userVotes.map(v => v.pollOptionId);
      pJson.totalVotes = pJson.options.reduce((acc, opt) => acc + (opt.votesCount || 0), 0);
      delete pJson.votes;
      return pJson;
    });

    return res.json({ polls: formatted });
  } catch (err) {
    console.error('Get polls error:', err);
    return res.status(500).json({ message: 'Erreur chargement sondages', error: err.message });
  }
};

exports.votePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { optionIds } = req.body; // array of option IDs or single ID

    const poll = await Poll.findByPk(pollId, {
      include: [{ model: PollOption, as: 'options' }]
    });

    if (!poll) {
      return res.status(404).json({ message: 'Sondage introuvable' });
    }

    if (poll.status === 'closed') {
      return res.status(400).json({ message: 'Ce sondage est clos, impossible de voter' });
    }

    // Check if user already voted
    const existingVotes = await PollVote.findAll({
      where: { pollId: poll.id, userId: req.user.id }
    });

    if (existingVotes.length > 0) {
      return res.status(400).json({ message: 'Vous avez déjà voté pour ce sondage' });
    }

    const selectedIds = Array.isArray(optionIds) ? optionIds : [optionIds];
    if (selectedIds.length === 0) {
      return res.status(400).json({ message: 'Aucune option sélectionnée' });
    }

    if (poll.type === 'single' && selectedIds.length > 1) {
      return res.status(400).json({ message: 'Ce vote n’autorise qu’un choix unique' });
    }

    // Record votes and increment counts
    const voterIdentifier = poll.isAnonymous ? 'anonymous' : `user_${req.user.id}`;
    for (const optId of selectedIds) {
      await PollVote.create({
        pollId: poll.id,
        pollOptionId: optId,
        userId: req.user.id,
        voterIdentifier
      });

      const option = poll.options.find(o => o.id === parseInt(optId, 10));
      if (option) {
        option.votesCount = (option.votesCount || 0) + 1;
        await option.save();
      }
    }

    // Return updated poll
    const updatedPoll = await Poll.findByPk(poll.id, {
      include: [
        { model: PollOption, as: 'options' },
        { model: User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    const pJson = updatedPoll.toJSON();
    pJson.hasVoted = true;
    pJson.mySelectedOptionIds = selectedIds.map(Number);
    pJson.totalVotes = pJson.options.reduce((acc, opt) => acc + (opt.votesCount || 0), 0);

    // Broadcast updated poll data to class room
    emitToClass(poll.classId, 'poll_updated', { poll: pJson });

    return res.json({
      message: 'Vote enregistré avec succès !',
      poll: pJson
    });
  } catch (err) {
    console.error('Vote error:', err);
    return res.status(500).json({ message: 'Erreur enregistrement vote', error: err.message });
  }
};

exports.togglePollStatus = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findByPk(pollId, {
      include: [{ model: PollOption, as: 'options' }]
    });

    if (!poll) {
      return res.status(404).json({ message: 'Sondage introuvable' });
    }

    poll.status = poll.status === 'active' ? 'closed' : 'active';
    poll.closedAt = poll.status === 'closed' ? new Date() : null;
    await poll.save();

    emitToClass(poll.classId, 'poll_status_toggled', { poll });

    return res.json({
      message: poll.status === 'closed' ? 'Sondage clôturé' : 'Sondage réouvert',
      poll
    });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur changement statut', error: err.message });
  }
};

exports.deletePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const poll = await Poll.findByPk(pollId);

    if (!poll) {
      return res.status(404).json({ message: 'Sondage introuvable' });
    }

    const classId = poll.classId;
    await poll.destroy();

    emitToClass(classId, 'poll_deleted', { pollId: parseInt(pollId, 10) });

    return res.json({ message: 'Sondage supprimé avec succès' });
  } catch (err) {
    return res.status(500).json({ message: 'Erreur suppression', error: err.message });
  }
};
