const {Session, Message, sequelize} = require('../models');

exports.getSessions = async(req, res) => {
    try {
        const sessions = await Session.findAll({
            include: [{
                model: Message,
                as: 'messages',
                required: true 
            }]
        });

        const sessionsWithMessages = sessions.filter(session => session.messages && session.messages.length > 0);

        res.json(sessionsWithMessages);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'An error occurred while retrieving sessions.'});
    }
};

exports.getMessages = async(req, res) => {
    const session_id = req.params.id;

    try {
        const messages = await Message.findAll({
            where: {
                session_id: session_id
            }
        });

        if (messages.length === 0) {
            return res.status(404).json({error: 'No messages found for the specified session.'});
        }

        res.json(messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({error: 'An error occurred while retrieving messages.'});
    }
};

