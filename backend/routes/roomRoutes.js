const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const uploadController = require('../controllers/uploadController');

router.post('/create', roomController.createRoom);
router.post('/join', roomController.joinRoom);
router.post('/leave', roomController.leaveRoom);
router.get('/joined', roomController.getJoinedRooms);
router.get('/:roomCode/messages', roomController.getMessages);

router.post('/:roomCode/upload/start', uploadController.startMultipartUpload);
router.post('/:roomCode/upload/presign', uploadController.getPresignedUrls);
router.post('/:roomCode/upload/complete', uploadController.completeMultipartUpload);
router.get('/:roomCode/video-url', uploadController.getVideoUrl);

module.exports = router;
