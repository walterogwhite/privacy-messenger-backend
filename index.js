
  // index.js
  const express = require('express');
  const http = require('http');
  const socketIo = require('socket.io');
  const cors = require('cors');
  const path = require('path');
  const { v4: uuidv4 } = require('uuid');
  
  const app = express();
  const server = http.createServer(app);
  const io = socketIo(server, {
    cors: {
      origin: "http://localhost:3000",
      methods: ["GET", "POST"]
    }
  });
  
  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  
  // Import routes and socket handlers
  const uploadRoutes = require('./routes/upload');
  const groupRoutes = require('./routes/groups');
  const messageRoutes = require('./routes/messages');
  const socketHandler = require('./socket/socketHandler');
  
  // Use routes
  app.use('/api/upload', uploadRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/messages', messageRoutes);
  
  // Initialize database
  const database = require('./database/database');
  
  // Socket handling
  socketHandler(io, database);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });
  
  const PORT = process.env.PORT || 8000;
  
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 WebSocket server ready`);
    console.log(`💾 Database initialized`);
  });