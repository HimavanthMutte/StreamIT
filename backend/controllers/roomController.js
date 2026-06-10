const Room = require('../models/Room');
const Message = require('../models/Message');

exports.createRoom = async (req, res) => {
  try {
    const { roomCode, userId } = req.body;

    if (!roomCode || !userId) {
      return res.status(400).json({ message: 'roomCode and userId are required' });
    }

    const existing = await Room.findOne({ roomCode });
    if (existing) {
      return res.status(400).json({ message: 'Room already exists. Join it instead.' });
    }

    const room = new Room({
      roomCode,
      creator: userId,
      participants: [userId]
    });
    await room.save();

    res.status(201).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { roomCode, userId } = req.body;

    if (!roomCode || !userId) {
      return res.status(400).json({ message: 'roomCode and userId are required' });
    }

    const room = await Room.findOne({ roomCode });

    if (!room) {
      return res.status(404).json({ message: 'Room not found. Check the code and try again.' });
    }

    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      await room.save();
    }

    res.status(200).json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getJoinedRooms = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const rooms = await Room.find({ participants: userId }).sort({ createdAt: -1 });
    res.status(200).json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const room = await Room.findOne({ roomCode }).populate('creator', 'username');
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }
    const messages = await Message.find({ roomCode }).populate('sender', 'username').sort({ timestamp: 1 });
    res.status(200).json({ room, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.leaveRoom = async (req, res) => {
  try {
    const { roomCode, userId } = req.body;

    if (!roomCode || !userId) {
      return res.status(400).json({ message: 'roomCode and userId are required' });
    }

    const room = await Room.findOne({ roomCode });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    room.participants = room.participants.filter(
      (p) => p.toString() !== userId.toString()
    );

    if (room.participants.length === 0) {
      await Room.deleteOne({ roomCode });
    } else {
      await room.save();
    }

    res.status(200).json({ message: 'Left room successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
