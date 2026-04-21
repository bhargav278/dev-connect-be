const express = require("express");
const http = require('http');
const { Server } = require('socket.io');
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const { setIo } = require('./src/utils/getIo');
const { initializeSocket } = require('./src/services/socket.service');
const { startScheduler } = require('./src/utils/scheduler');
const authRoutes = require("./src/routes/auth.route");
const userRoutes = require("./src/routes/user.route");
const followRoutes = require("./src/routes/follow.route");
const postRoutes = require("./src/routes/post.route");
const notificationRoutes = require('./src/routes/notification.route');
const { sendSuccess, sendError, HTTP_STATUS } = require("./src/utils/ApiResponse");

const app = express();
const server = http.createServer(app);

// ─── Socket.io Setup ────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  },
  pingTimeout: 20000,   // wait 20s for pong before disconnecting
  pingInterval: 25000,  // send ping every 25s
});

setIo(io);
initializeSocket(io);
startScheduler();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

//Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/posts", postRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check route
app.get("/api/health", (req, res) => {
  return sendSuccess(res, HTTP_STATUS.OK, "DevConnect API is running 🚀");
});

// 404 handler
app.use((req, res) => {
  return sendError(res, HTTP_STATUS.NOT_FOUND, "Route not found");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  return sendError(
    res,
    err.status || HTTP_STATUS.INTERNAL_ERROR,
    err.message || "Internal server error",
  );
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
