require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Connect DB
connectDB();

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'CRM Backend Running' });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server only in local development (not on Vercel serverless)
if (!process.env.VERCEL) {
  const http = require('http');
  const { Server } = require('socket.io');
  const { startReminderJob } = require('./utils/reminderJob');

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
    });
    socket.on('disconnect', () => {
      console.log('🔌 Disconnected:', socket.id);
    });
  });

  app.set('io', io);

  startReminderJob(io);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
