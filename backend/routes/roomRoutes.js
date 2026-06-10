const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.post('/create', roomController.createRoom);
router.post('/join', roomController.joinRoom);
router.post('/leave', roomController.leaveRoom);
router.get('/joined', roomController.getJoinedRooms);
router.get('/:roomCode/messages', roomController.getMessages);

module.exports = router;
