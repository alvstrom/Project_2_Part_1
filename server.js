require("dotenv").config();
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

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
  let token = socket.handshake.auth && socket.handshake.auth.token;

  // Optional fallback to Authorization header (Bearer <token>)
  if (!token) {
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) {
    return next(new Error("AUTH_ERROR:No token"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId || decoded.id;
    socket.username = decoded.username;
    return next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return next(new Error("TOKEN_EXPIRED"));
    }
    return next(new Error("AUTH_ERROR:Invalid token"));
    console.error("JWT Error:", err);
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
