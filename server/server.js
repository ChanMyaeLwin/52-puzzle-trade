// backend/server.js

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Allow frontend to connect (adjust origin for production)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite default port
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // When a player joins a room
  socket.on("join-room", (roomCode) => {
    socket.join(roomCode);
    console.log(`🔗 ${socket.id} joined room ${roomCode}`);

    // Notify others in the room
    socket.to(roomCode).emit("user-joined", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// Start the server
const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running at http://localhost:${PORT}`);
});
