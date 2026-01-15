// Try to load .env file (optional - environment variables can also be set in package.json or shell)
try {
  require('dotenv').config();
} catch (error) {
  console.log('ℹ️  No .env file loaded (using environment variables from package.json)');
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const { Server } = require('socket.io');

// Import models (to register schemas)
const User = require('./models/User');
const Thread = require('./models/Thread');
const Message = require('./models/Message');
const Claim = require('./models/Claim');

// Import routes
const threadRoutes = require('./routes/threads');
const messageRoutes = require('./routes/messages');
const llmRoutes = require('./routes/llm');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Make io accessible to routes
app.set('io', io);

// MongoDB Connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
    console.log(`📊 Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

// Connect to MongoDB
connectDB();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('join_thread', (threadId) => {
    socket.join(`thread_${threadId}`);
    console.log(`📝 Client ${socket.id} joined thread ${threadId}`);
  });

  socket.on('leave_thread', (threadId) => {
    socket.leave(`thread_${threadId}`);
    console.log(`📤 Client ${socket.id} left thread ${threadId}`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/threads', threadRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/llm', llmRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'FraySpace API Server',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      threads: '/api/threads',
      messages: '/api/messages',
      llm: '/api/llm'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 FraySpace API Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API: http://localhost:${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('🛑 Server closed');
    mongoose.connection.close(false, () => {
      console.log('🛑 MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, server, io };

