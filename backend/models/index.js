const User = require("./User");
const Timetable = require("./Timetable");
const Task = require("./Task");
const AcademicEvent = require("./AcademicEvent");
const Message = require("./Message");
const Faculty = require("./Faculty");
const Directory = require("./Directory");
const Notice = require("./Notice");
const Exam = require("./Exam");
const Department = require("./Department");
const Lab = require("./Lab");
const Facility = require("./Facility");
const Hostel = require("./Hostel");
const Emergency = require("./Emergency");
const Complaint = require("./Complaint");
const { Video, SavedVideo } = require("./Video");
const { Note, SavedNote } = require("./Note");
const Attendance = require("./Attendance");
const Notification = require("./Notification");
const PassRequest = require("./PassRequest");
const FeeRecord = require("./FeeRecord");
const { MessMenu, MessInventory } = require("./MessRecord");

module.exports = {
  User,
  Attendance,
  Timetable,
  Task,
  AcademicEvent,
  Message,
  Faculty,
  Directory,
  Notice,
  Exam,
  Department,
  Lab,
  Facility,
  Hostel,
  Emergency,
  Complaint,
  Video,
  SavedVideo,
  Note,
  SavedNote,
  Notification,
  PassRequest,
  FeeRecord,
  MessMenu,
  MessInventory,
};
