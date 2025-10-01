require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Test endpoint to generate JWT tokens
app.post("/auth/login", (req, res) => {
  const { username, userId } = req.body;

  if (!username || !userId) {
    return res.status(400).json({ error: "Username and userId required" });
  }

  const token = jwt.sign({ username, userId }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  res.json({ token, username, userId });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server running!", timestamp: new Date().toISOString() });
});

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*", //TODO: replace with valid URL later
    methods: ["GET", "POST"],
  },
});

//JWT auth middleware for socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.username = decoded.username;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`User ${socket.username} connected`);

  socket.on("message", (data) => {
    io.emit("message", {
      text: data.text,
      username: socket.username,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.username} disconnected`);
  });
});

const PORT = process.env.PORT || 3005;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
