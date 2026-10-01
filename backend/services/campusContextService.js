const {
  Timetable,
  Faculty,
  Directory,
  Notice,
  Exam,
  Note,
  AcademicEvent,
  Task,
} = require("../models");

async function getCampusContext(user, message) {
  const lower = message.toLowerCase();
  let context = "";

  // TIMETABLE
  if (
    lower.includes("class") ||
    lower.includes("timetable") ||
    lower.includes("schedule") ||
    lower.includes("lecture") ||
    lower.includes("next")
  ) {
    const timetable = await Timetable.find({
      department: user.department,
      semester: user.semester,
      section: user.section,
      isCancelled: false,
    })
      .sort({ dayOrder: 1, startTime: 1 })
      .limit(50)
      .lean();

    context += `\nTIMETABLE:\n${JSON.stringify(timetable)}\n`;
  }

  // FACULTY
  if (
    lower.includes("faculty") ||
    lower.includes("teacher") ||
    lower.includes("professor") ||
    lower.includes("sir") ||
    lower.includes("madam") ||
    lower.includes("who teaches")
  ) {
    const faculty = await Faculty.find({
      status: "active",
    })
      .sort({ name: 1 })
      .limit(50)
      .lean();

    context += `\nFACULTY:\n${JSON.stringify(faculty)}\n`;
  }

  // DIRECTORY
  if (
    lower.includes("where") ||
    lower.includes("room") ||
    lower.includes("lab") ||
    lower.includes("location") ||
    lower.includes("block")
  ) {
    const directory = await Directory.find({
      status: "active",
    })
      .limit(50)
      .lean();

    context += `\nDIRECTORY:\n${JSON.stringify(directory)}\n`;
  }

  // NOTICES
  if (
    lower.includes("notice") ||
    lower.includes("announcement") ||
    lower.includes("circular")
  ) {
    const notices = await Notice.find({
      status: "active",
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    context += `\nNOTICES:\n${JSON.stringify(notices)}\n`;
  }

  // EXAMS
  if (
    lower.includes("exam") ||
    lower.includes("test") ||
    lower.includes("semester exam")
  ) {
    const exams = await Exam.find({
      department: user.department,
      semester: user.semester,
    })
      .sort({ examDate: 1 })
      .limit(30)
      .lean();

    context += `\nEXAMS:\n${JSON.stringify(exams)}\n`;
  }

  // NOTES
  if (
    lower.includes("note") ||
    lower.includes("notes") ||
    lower.includes("study material")
  ) {
    const notes = await Note.find({
      status: "active",
      $or: [
        { department: user.department },
        { department: "" },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    context += `\nNOTES:\n${JSON.stringify(notes)}\n`;
  }

  // CALENDAR
  if (
    lower.includes("calendar") ||
    lower.includes("holiday") ||
    lower.includes("event") ||
    lower.includes("academic")
  ) {
    const events = await AcademicEvent.find({
      $or: [
        { department: "" },
        { department: user.department },
      ],
    })
      .sort({ date: 1 })
      .limit(50)
      .lean();

    context += `\nACADEMIC CALENDAR:\n${JSON.stringify(events)}\n`;
  }

  // TASKS
  if (
    lower.includes("task") ||
    lower.includes("todo") ||
    lower.includes("assignment")
  ) {
    const tasks = await Task.find({
      student: user._id,
    })
      .sort({ date: 1, startTime: 1 })
      .limit(30)
      .lean();

    context += `\nSTUDENT TASKS:\n${JSON.stringify(tasks)}\n`;
  }

  return context;
}

module.exports = {
  getCampusContext,
};
