const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/chats', chatController.getSessions);
router.get('/chats/:id', chatController.getMessages);

module.exports = router;