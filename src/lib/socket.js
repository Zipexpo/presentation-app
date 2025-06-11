// lib/socket.ts
import { Server } from 'socket.io';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL,
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('a user connected');
    
    // Join a presentation room
    socket.on('join-presentation', (sessionKey) => {
      socket.join(sessionKey);
    });
    
    // Teacher controls
    socket.on('start-presentation', (sessionKey) => {
      io.to(sessionKey).emit('presentation-started');
    });
    
    socket.on('next-presentation', (sessionKey, nextIndex) => {
      io.to(sessionKey).emit('move-to-presentation', nextIndex);
    });
    
    // Student feedback
    socket.on('submit-feedback', (sessionKey, feedback) => {
      io.to(sessionKey).emit('new-feedback', feedback);
    });
    
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}