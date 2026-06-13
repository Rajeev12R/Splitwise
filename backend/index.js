import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import groupRoutes from './routes/groups.js';
import expenseRoutes from './routes/expenses.js';
import settlementRoutes from './routes/settlements.js';
import commentRoutes from './routes/comments.js';

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://splitwise-gold-seven.vercel.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[HTTP] ${req.method} ${req.path}`, req.body);
  next();
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions
});

app.set('io', io);

app.use('/api/auth', authRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/comments', commentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on('join_expense', (expenseId) => {
    const roomName = `room:expense:${expenseId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('leave_expense', (expenseId) => {
    const roomName = `room:expense:${expenseId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left room: ${roomName}`);
  });

  socket.on('join_group', (groupId) => {
    const roomName = `room:group:${groupId}`;
    socket.join(roomName);
    console.log(`Socket ${socket.id} joined room: ${roomName}`);
  });

  socket.on('leave_group', (groupId) => {
    const roomName = `room:group:${groupId}`;
    socket.leave(roomName);
    console.log(`Socket ${socket.id} left room: ${roomName}`);
  });

  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
