const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const mongoose = require("mongoose");

let cachedConnection = null;

async function connectDB() {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error("MONGODB_URI is missing in environment variables");
  }

  // If already connected or connecting, return existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (cachedConnection) {
    return cachedConnection;
  }

  cachedConnection = mongoose
    .connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
    })
    .then((mongooseInstance) => {
      console.log("MongoDB connected successfully");
      return mongooseInstance.connection;
    })
    .catch((err) => {
      cachedConnection = null;
      throw err;
    });

  return cachedConnection;
}

module.exports = connectDB;
