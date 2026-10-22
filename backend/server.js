const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);

const Message = require('./models/Message');

// In-memory store for room playback state and host tracking
const roomStates = {};

io.on('connection', (socket) => {
  socket.on('join-room', ({ roomCode, username }) => {
    socket.join(roomCode);
    socket.data.username = username;
    socket.data.roomCode = roomCode;

    // Initialize or retrieve room state
    if (!roomStates[roomCode]) {
      roomStates[roomCode] = {
        hostSocketId: socket.id, // first participant is host
        isPlaying: false,
        timestamp: 0,
        lastUpdate: Date.now(),
        intervalId: setInterval(() => {
          const state = roomStates[roomCode];
          if (!state) return;
          let current = state.timestamp;
          if (state.isPlaying) {
            const elapsed = (Date.now() - state.lastUpdate) / 1000;
            current = state.timestamp + elapsed;
          }
          // Emit to all participants (including host) the current playback state
          io.to(roomCode).emit('sync-timestamp', { time: current, isPlaying: state.isPlaying });
        }, 5000)
      };
    } else {
      // Ensure host tracking persists
      if (!roomStates[roomCode].hostSocketId) {
        roomStates[roomCode].hostSocketId = socket.id;
      }
    }

    // Send current state to the newly joined socket (late joiner)
    const state = roomStates[roomCode];
    let current = state.timestamp;
    if (state.isPlaying) {
      const elapsed = (Date.now() - state.lastUpdate) / 1000;
      current = state.timestamp + elapsed;
    }
    socket.emit('sync-timestamp', { time: current, isPlaying: state.isPlaying });
    io.to(roomCode).emit('user-joined', { username });
  });

  socket.on('send-message', async (data) => {
    try {
      const { roomCode, senderId, text, username } = data;
      const newMessage = new Message({
        roomCode,
        sender: senderId,
        text,
      });
      await newMessage.save();

      io.to(roomCode).emit('receive-message', {
        _id: newMessage._id,
        roomCode,
        sender: { _id: senderId, username },
        text,
        timestamp: newMessage.timestamp,
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('user-typing', ({ roomCode, username, isTyping }) => {
    socket.to(roomCode).emit('user-typing', { username, isTyping });
  });

  socket.on('leave-room', ({ roomCode, username }) => {
    socket.leave(roomCode);
    io.to(roomCode).emit('user-left', { username });
  });

  socket.on('kick-user', ({ roomCode, targetUsername }) => {
    io.to(roomCode).emit('user-kicked', { username: targetUsername });
  });

  socket.on('video-uploaded', ({ roomCode }) => {
    io.to(roomCode).emit('video-uploaded');
  });

  socket.on('video-play', ({ roomCode, time }) => {
    const state = roomStates[roomCode];
    if (state) {
      state.isPlaying = true;
      state.timestamp = time;
      state.lastUpdate = Date.now();
    }
    socket.to(roomCode).emit('video-play', { time });
  });

  socket.on('video-pause', ({ roomCode, time }) => {
    const state = roomStates[roomCode];
    if (state) {
      state.isPlaying = false;
      state.timestamp = time;
      state.lastUpdate = Date.now();
    }
    socket.to(roomCode).emit('video-pause', { time });
  });

  socket.on('video-seek', ({ roomCode, time }) => {
    const state = roomStates[roomCode];
    if (state) {
      state.timestamp = time;
      state.lastUpdate = Date.now();
    }
    socket.to(roomCode).emit('video-seek', { time });
  });

  socket.on('disconnect', () => {
    const { username, roomCode } = socket.data;
    if (roomCode && username) {
      // Reassign host if needed
      const state = roomStates[roomCode];
      if (state && state.hostSocketId === socket.id) {
        const socketsInRoom = io.sockets.adapter.rooms.get(roomCode);
        if (socketsInRoom && socketsInRoom.size > 0) {
          const newHostId = [...socketsInRoom][0];
          state.hostSocketId = newHostId;
        } else {
          clearInterval(state?.intervalId);
          delete roomStates[roomCode];
        }
      }
      io.to(roomCode).emit('user-disconnected', { username });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
