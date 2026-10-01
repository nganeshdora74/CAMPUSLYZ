const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const rateLimit = require("express-rate-limit");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ====================== RATE LIMITING ======================
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." }
});
app.use(limiter);

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { message: "Chat limit exceeded. Please wait." }
});

// ====================== MODELS ======================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },
  department: String,
  semester: Number,
  section: String,
  rollNumber: String,
}, { timestamps: true });

const timetableSchema = new mongoose.Schema({
  department: String,
  semester: Number,
  section: String,
  day: String,
  dayOrder: Number,
  startTime: String,
  endTime: String,
  subject: String,
  faculty: String,
  room: String,
  isCancelled: { type: Boolean, default: false }
}, { timestamps: true });

const facultySchema = new mongoose.Schema({
  name: String,
  department: String,
  designation: String,
  subjects: [String],
  cabin: String,
  email: String,
  officeHours: String,
  status: { type: String, default: "active" }
}, { timestamps: true });

const directorySchema = new mongoose.Schema({
  name: String,
  type: String,
  block: String,
  floor: String,
  room: String,
  description: String,
  keywords: [String],
  status: { type: String, default: "active" }
}, { timestamps: true });

const noticeSchema = new mongoose.Schema({
  title: String,
  content: String,
  isPinned: { type: Boolean, default: false },
  status: { type: String, default: "active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

const examSchema = new mongoose.Schema({
  department: String,
  semester: Number,
  subject: String,
  examDate: String,
  time: String,
  room: String,
  rollRange: String,
  instructions: String
}, { timestamps: true });

const departmentSchema = new mongoose.Schema({
  name: String,
  shortName: String,
  hod: String,
  block: String,
  floor: String,
  contact: String,
  status: { type: String, default: "active" }
}, { timestamps: true });

const labSchema = new mongoose.Schema({
  name: String,
  department: String,
  block: String,
  floor: String,
  room: String,
  inCharge: String,
  capacity: Number,
  timings: String,
  status: { type: String, default: "active" }
}, { timestamps: true });

const facilitySchema = new mongoose.Schema({
  name: String,
  type: String,
  block: String,
  floor: String,
  timings: String,
  description: String,
  status: { type: String, default: "active" }
}, { timestamps: true });

const hostelSchema = new mongoose.Schema({
  name: String,
  type: String,
  warden: String,
  contact: String,
  messTimings: String,
  rules: String,
  status: { type: String, default: "active" }
}, { timestamps: true });

const emergencySchema = new mongoose.Schema({
  title: String,
  number: String,
  description: String,
  order: Number
}, { timestamps: true });

const complaintSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  studentName: String,
  category: String,
  title: String,
  description: String,
  location: String,
  status: { type: String, enum: ["Pending", "In Progress", "Resolved"], default: "Pending" }
}, { timestamps: true });

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ["live", "recorded"], required: true },
  subject: String,
  department: String,
  semester: Number,
  faculty: String,
  videoUrl: String,
  meetingLink: String,
  scheduledAt: Date,
  thumbnail: String,
  duration: String,
  status: { type: String, enum: ["upcoming", "live", "completed", "recorded"], default: "upcoming" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

const savedVideoSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  video: { type: mongoose.Schema.Types.ObjectId, ref: "Video" }
}, { timestamps: true });

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  subject: String,
  department: String,
  semester: Number,
  topic: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdByName: String,
  status: { type: String, default: "active" }
}, { timestamps: true });

const savedNoteSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  note: { type: mongoose.Schema.Types.ObjectId, ref: "Note" }
}, { timestamps: true });

// Register Models
const User = mongoose.model("User", userSchema);
const Timetable = mongoose.model("Timetable", timetableSchema);
const Faculty = mongoose.model("Faculty", facultySchema);
const Directory = mongoose.model("Directory", directorySchema);
const Notice = mongoose.model("Notice", noticeSchema);
const Exam = mongoose.model("Exam", examSchema);
const Department = mongoose.model("Department", departmentSchema);
const Lab = mongoose.model("Lab", labSchema);
const Facility = mongoose.model("Facility", facilitySchema);
const Hostel = mongoose.model("Hostel", hostelSchema);
const Emergency = mongoose.model("Emergency", emergencySchema);
const Complaint = mongoose.model("Complaint", complaintSchema);
const Video = mongoose.model("Video", videoSchema);
const SavedVideo = mongoose.model("SavedVideo", savedVideoSchema);
const Note = mongoose.model("Note", noteSchema);
const SavedNote = mongoose.model("SavedNote", savedNoteSchema);

// ====================== MIDDLEWARE ======================
const auth = (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ message: "No token, authorization denied" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secretkey");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token is not valid" });
  }
};

const checkAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ====================== AUTH ======================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password, department, semester, section, rollNumber, role } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ name, email, password: hashedPassword, department, semester, section, rollNumber, role: role || "student" });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secretkey", { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, name: user.name, role: user.role, department: user.department } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || "secretkey", { expiresIn: "7d" });
    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, department: user.department, semester: user.semester, section: user.section }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== TIMETABLE ======================
app.get("/api/timetable/my", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const data = await Timetable.find({
      department: user.department,
      semester: user.semester,
      section: user.section,
      isCancelled: false
    }).sort({ dayOrder: 1, startTime: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/timetable/next", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    const classes = await Timetable.find({
      department: user.department,
      semester: user.semester,
      section: user.section,
      day: currentDay,
      isCancelled: false
    }).sort({ startTime: 1 });

    const nextClass = classes.find(cls => cls.startTime > currentTime);
    res.json(nextClass || null);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== FACULTY & DIRECTORY ======================
app.get("/api/faculty", auth, async (req, res) => {
  try {
    const filter = { status: "active" };
    if (req.query.department) filter.department = req.query.department;
    const data = await Faculty.find(filter).sort({ name: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/directory", auth, async (req, res) => {
  try {
    const filter = { status: "active" };
    if (req.query.type) filter.type = req.query.type;
    const data = await Directory.find(filter).sort({ name: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/directory/search", auth, async (req, res) => {
  try {
    const keyword = req.query.q || "";
    const data = await Directory.find({
      status: "active",
      $or: [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { keywords: { $regex: keyword, $options: "i" } }
      ]
    }).limit(20);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== NOTICES & EXAMS ======================
app.get("/api/notices", auth, async (req, res) => {
  try {
    const data = await Notice.find({ status: "active" }).sort({ isPinned: -1, createdAt: -1 }).limit(30);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/exams/my", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const data = await Exam.find({ department: user.department, semester: user.semester }).sort({ examDate: 1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== COMPLAINTS ======================
app.post("/api/complaints", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const complaint = new Complaint({
      student: req.user.id,
      studentName: user.name,
      category: req.body.category,
      title: req.body.title,
      description: req.body.description,
      location: req.body.location || ""
    });
    await complaint.save();
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/complaints/my", auth, async (req, res) => {
  try {
    const data = await Complaint.find({ student: req.user.id }).sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== VIDEOS ======================
app.get("/api/videos", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.semester) filter.semester = Number(req.query.semester);
    if (req.query.status) filter.status = req.query.status;
    const videos = await Video.find(filter).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/videos/:id", auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/videos/save/:id", auth, async (req, res) => {
  try {
    const exists = await SavedVideo.findOne({ student: req.user.id, video: req.params.id });
    if (exists) return res.status(400).json({ message: "Video already saved" });
    await new SavedVideo({ student: req.user.id, video: req.params.id }).save();
    res.json({ success: true, message: "Video saved successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/videos/saved/my", auth, async (req, res) => {
  try {
    const saved = await SavedVideo.find({ student: req.user.id }).populate("video");
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/videos/save/:id", auth, async (req, res) => {
  try {
    await SavedVideo.findOneAndDelete({ student: req.user.id, video: req.params.id });
    res.json({ success: true, message: "Removed from saved" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== NOTES ======================
app.get("/api/notes", auth, async (req, res) => {
  try {
    const filter = { status: "active" };
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.semester) filter.semester = Number(req.query.semester);
    const notes = await Note.find(filter).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/notes/:id", auth, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json(note);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/notes/save/:id", auth, async (req, res) => {
  try {
    const exists = await SavedNote.findOne({ student: req.user.id, note: req.params.id });
    if (exists) return res.status(400).json({ message: "Note already saved" });
    await new SavedNote({ student: req.user.id, note: req.params.id }).save();
    res.json({ success: true, message: "Note saved successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/notes/saved/my", auth, async (req, res) => {
  try {
    const saved = await SavedNote.find({ student: req.user.id }).populate("note").sort({ createdAt: -1 });
    res.json(saved);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/notes/save/:id", auth, async (req, res) => {
  try {
    await SavedNote.findOneAndDelete({ student: req.user.id, note: req.params.id });
    res.json({ success: true, message: "Removed from saved notes" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ====================== AI CHATBOT ======================
const openai = process.env.OPENROUTER_API_KEY
  ? {
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
      headers: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://campusly.app",
        "X-Title": process.env.OPENROUTER_SITE_NAME || "Campusly",
      },
    }
  : null;

app.post("/api/chat", auth, chatLimiter, async (req, res) => {
  try {
    const { message } = req.body;
    if (!openai) {
  return res.status(503).json({
    success: false,
    message: "AI chatbot is not configured. Add OPENROUTER_API_KEY to .env"
  });
}

    const user = await User.findById(req.user.id);
    const systemPrompt = `You are a helpful Digital Campus Companion AI Assistant for college students.
Student: ${user?.name}, Department: ${user?.department}, Semester: ${user?.semester}, Section: ${user?.section}.
Help with timetable, faculty, locations, notices, exams, videos, notes etc. Give short and clear answers.`;

    const completion = await fetch(`${openai.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openai.apiKey}`,
          "HTTP-Referer": openai.headers["HTTP-Referer"],
          "X-Title": openai.headers["X-Title"],
        },
        body: JSON.stringify({
          model: openai.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          max_tokens: 400
        }),
      });

      const data = await completion.json();

      if (!completion.ok) {
        throw new Error(data?.error?.message || `OpenRouter API error: ${completion.status}`);
      }

      res.json({ success: true, reply: data?.choices?.[0]?.message?.content || "Sorry, I could not generate an answer." });
  } catch (err) {
    res.status(500).json({ success: false, message: "AI is currently unavailable" });
  }
});

// ====================== ADMIN ROUTES ======================
app.post("/api/admin/notices", auth, checkAdmin, async (req, res) => {
  try {
    const notice = new Notice({ ...req.body, createdBy: req.user.id });
    await notice.save();
    res.json({ success: true, notice });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/admin/videos", auth, checkAdmin, async (req, res) => {
  try {
    const video = new Video({ ...req.body, createdBy: req.user.id });
    await video.save();
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/admin/videos/:id", auth, checkAdmin, async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!video) return res.status(404).json({ message: "Video not found" });
    res.json({ success: true, video });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/admin/videos/:id", auth, checkAdmin, async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    await SavedVideo.deleteMany({ video: req.params.id });
    res.json({ success: true, message: "Video deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/admin/notes", auth, checkAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const note = new Note({ ...req.body, createdBy: req.user.id, createdByName: user.name });
    await note.save();
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/admin/notes/:id", auth, checkAdmin, async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!note) return res.status(404).json({ message: "Note not found" });
    res.json({ success: true, note });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete("/api/admin/notes/:id", auth, checkAdmin, async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    await SavedNote.deleteMany({ note: req.params.id });
    res.json({ success: true, message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/admin/complaints", auth, checkAdmin, async (req, res) => {
  try {
    const data = await Complaint.find().sort({ createdAt: -1 }).limit(50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.put("/api/admin/complaints/:id", auth, checkAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Pending", "In Progress", "Resolved"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const complaint = await Complaint.findByIdAndUpdate(req.params.id, { status }, { new: true });
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/admin/dashboard", auth, checkAdmin, async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: "student" });
    const activeNotices = await Notice.countDocuments({ status: "active" });
    const pendingComplaints = await Complaint.countDocuments({ status: "Pending" });
    res.json({ totalStudents, activeNotices, pendingComplaints });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ===============================
// DATABASE + SERVER
// ===============================

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Campusly Backend is running!",
  });
});

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Campusly Backend running at http://localhost:${PORT}`);
});

server.on("error", (error) => {
  console.error("SERVER ERROR:", error);
});

process.on("SIGINT", () => {
  console.log("Shutting down Campusly backend...");
  server.close(() => {
    process.exit(0);
  });
});