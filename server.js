const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'https://tele-frontend-f6b9tn4op-aditya-sajwan-s-projects.vercel.app/'];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
    credentials: true
  }
});

const activeRooms = new Map();

// Middleware
// Configure CORS to allow browser requests
// NOTE: This is permissive (allows any origin). For stricter security,
//       pass an explicit list of allowed origins instead.
app.use(cors({
  origin: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/patient', require('./routes/patient'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/prescriptions', require('./routes/prescriptions'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  const leaveRoom = () => {
    const { appointmentId } = socket.data || {};
    if (!appointmentId) {
      return;
    }

    socket.leave(appointmentId);

    const roomPeers = activeRooms.get(appointmentId);
    if (roomPeers) {
      roomPeers.delete(socket.id);
      if (roomPeers.size === 0) {
        activeRooms.delete(appointmentId);
      }
    }

    socket.to(appointmentId).emit('peer-left', { socketId: socket.id });
    socket.data = null;
  };

  socket.on('join-room', ({ appointmentId, user }) => {
    if (!appointmentId || !user) {
      return;
    }

    socket.join(appointmentId);
    socket.data = { appointmentId, user };

    if (!activeRooms.has(appointmentId)) {
      activeRooms.set(appointmentId, new Map());
    }
    const roomPeers = activeRooms.get(appointmentId);
    roomPeers.set(socket.id, user);

    const existingPeers = Array.from(roomPeers.entries())
      .filter(([peerId]) => peerId !== socket.id)
      .map(([peerId, peerUser]) => ({
        socketId: peerId,
        user: peerUser
      }));

    if (existingPeers.length > 0) {
      socket.emit('existing-peers', existingPeers);
    }

    socket.to(appointmentId).emit('peer-joined', {
      socketId: socket.id,
      user
    });
  });

  socket.on('signal', ({ target, data }) => {
    if (!target || !data) {
      return;
    }
    io.to(target).emit('signal', {
      from: socket.id,
      data
    });
  });

  socket.on('chat-message', ({ appointmentId, message }) => {
    if (!appointmentId || !message || !message.trim()) {
      return;
    }

    io.to(appointmentId).emit('chat-message', {
      sender: socket.data?.user || { name: 'Unknown' },
      message: message.trim(),
      timestamp: new Date().toISOString()
    });
  });

  socket.on('leave-room', leaveRoom);
  socket.on('disconnect', () => {
    leaveRoom();
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const PORT = process.env.PORT || 5000;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Troubleshooting tips:');
      console.error('1. Check if your MongoDB password is correct');
      console.error('2. If password contains special characters, URL-encode them:');
      console.error('   - @ becomes %40');
      console.error('   - # becomes %23');
      console.error('   - / becomes %2F');
      console.error('   - : becomes %3A');
      console.error('3. Make sure your IP address is whitelisted in MongoDB Atlas');
      console.error('4. Verify the database user exists in MongoDB Atlas');
      console.error('\n📝 Connection string format:');
      console.error('mongodb+srv://username:password@cluster.mongodb.net/database');
    }
    
    process.exit(1);
  }
};

connectDB();

