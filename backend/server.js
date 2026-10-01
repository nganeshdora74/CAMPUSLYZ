const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const { PORT } = require("./config/env");
const connectDB = require("./config/db");
const aiConfig = require("./config/ai");
const admin = require("./config/firebase");
const { limiter } = require("./middleware/rateLimiter");
const apiRoutes = require("./routes");

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Rate limiting on API routes
app.use("/api", limiter);

// ============================================================
// ROUTES
// ============================================================

// Ensure database is connected before handling API requests
app.use(async (req, res, next) => {
  if (req.path === "/" || req.path === "/favicon.ico") {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection error:", error.message);
    if (req.path === "/api/health") {
      return next();
    }
    return res.status(500).json({
      success: false,
      message: "Database connection error",
      error: error.message,
    });
  }
});

// Root welcome route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Campusly Backend is running!",
    version: "2.0.0",
  });
});

// Mount modular API routes
app.use("/api", apiRoutes);

// Global error handler
app.use((err, req, res, next) => {
  console.error("SERVER UNHANDLED ERROR:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ============================================================
// DATABASE & SERVER INITIALIZATION
// ============================================================

async function startServer() {
  try {
    const db = await connectDB();

    console.log(`host : ${db.connection ? db.connection.host : db.host || "connected"}`);
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Campusly Backend running on port ${PORT}`);
      console.log(`Local: http://localhost:${PORT}`);
      console.log(`Health: http://localhost:${PORT}/api/health`);
      console.log(
        `AI: ${aiConfig ? "configured (OpenRouter)" : "not configured"}`
      );
      console.log(
        `Firebase: ${admin.apps.length ? "configured" : "not configured"}`
      );
    });

    server.on("error", (error) => {
      console.error("SERVER ERROR:", error);
    });

    process.on("SIGINT", async () => {
      console.log("Shutting down Campusly backend...");
      await mongoose.connection.close();
      server.close(() => {
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("DATABASE/SERVER ERROR:", error.message);
    process.exit(1);
  }
}

// Only start the HTTP listener when run directly (local development)
if (require.main === module) {
  startServer();
}

module.exports = app;