const { Attendance, User } = require("../models");

/**
 * Record or update subject-wise attendance for a class session.
 * Accessible ONLY by Teachers and Administrators.
 */
exports.recordSubjectAttendance = async (req, res) => {
  try {
    const {
      subject,
      subjectCode,
      department,
      section,
      date,
      records,
    } = req.body;

    if (!subject || !date) {
      return res.status(400).json({
        success: false,
        message: "Subject and date are required",
      });
    }

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Records array is required with at least one student",
      });
    }

    const markedByName = req.currentUser?.name || "Teacher / Admin";
    const markedByRole = req.currentUser?.role || "teacher";

    const savedRecords = [];
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    for (const item of records) {
      const studentId = item.studentId || item.student;
      if (!studentId) continue;

      const status = item.status === "Absent" ? "Absent" : item.status === "Late" ? "Late" : "Present";
      const isPresent = status === "Present";
      const remarks = item.remarks || "-";

      if (status === "Present") presentCount++;
      else if (status === "Absent") absentCount++;
      else if (status === "Late") lateCount++;

      // Upsert attendance record for this student, subject, and date
      const filter = {
        student: studentId,
        subject: subject.trim(),
        date: date.trim(),
      };

      const update = {
        student: studentId,
        studentName: item.studentName || "Student",
        rollNumber: item.rollNumber || item.rollNo || "",
        subject: subject.trim(),
        subjectCode: subjectCode || "",
        department: department || "CSE",
        section: section || "A",
        date: date.trim(),
        status,
        present: isPresent,
        remarks,
        markedBy: req.user.id,
        markedByName,
        markedByRole,
      };

      const doc = await Attendance.findOneAndUpdate(filter, update, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      });

      savedRecords.push(doc);
    }

    return res.status(200).json({
      success: true,
      message: `Successfully recorded ${subject} attendance for ${savedRecords.length} students`,
      summary: {
        subject,
        date,
        total: savedRecords.length,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        attendanceRate: savedRecords.length > 0 ? `${Math.round((presentCount / savedRecords.length) * 100)}%` : "0%",
        markedByName,
        markedByRole,
      },
      records: savedRecords,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subject-wise attendance breakdown and history for the logged-in student.
 */
exports.getMySubjectAttendance = async (req, res) => {
  try {
    const studentId = req.user.id;
    const records = await Attendance.find({ student: studentId }).sort({ createdAt: -1 });

    // Calculate subject-wise breakdown
    const subjectMap = {};
    let totalClasses = records.length;
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    records.forEach((r) => {
      const subj = r.subject || "General";
      if (!subjectMap[subj]) {
        subjectMap[subj] = {
          subject: subj,
          subjectCode: r.subjectCode || "",
          totalClasses: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0,
          isEligible: true,
          shortageCount: 0,
        };
      }

      subjectMap[subj].totalClasses += 1;
      if (r.status === "Present") {
        subjectMap[subj].present += 1;
        totalPresent += 1;
      } else if (r.status === "Absent") {
        subjectMap[subj].absent += 1;
        totalAbsent += 1;
      } else if (r.status === "Late") {
        subjectMap[subj].late += 1;
        totalLate += 1;
      }
    });

    const subjectBreakdown = Object.values(subjectMap).map((item) => {
      const pct = item.totalClasses > 0 ? Math.round((item.present / item.totalClasses) * 100) : 0;
      const isEligible = pct >= 75;
      const shortage = isEligible ? 0 : Math.max(0, Math.ceil(3 * item.totalClasses - 4 * item.present));
      return {
        ...item,
        percentage: pct,
        isEligible,
        shortageCount: shortage,
      };
    });

    const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

    return res.status(200).json({
      success: true,
      stats: {
        totalClasses,
        presentClasses: totalPresent,
        absentClasses: totalAbsent,
        lateClasses: totalLate,
        percentage: overallPercentage,
        isEligible: overallPercentage >= 75,
      },
      subjectBreakdown,
      history: records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subject-wise attendance for a specific student.
 * Students can only view their own; teachers and admins can view any student.
 */
exports.getStudentSubjectAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Check permission: if student, must be their own ID
    if (req.user.role === "student" && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own attendance records",
      });
    }

    const studentUser = await User.findById(studentId).select("name rollNumber department section semester");
    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const records = await Attendance.find({ student: studentId }).sort({ createdAt: -1 });

    const subjectMap = {};
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;

    records.forEach((r) => {
      const subj = r.subject || "General";
      if (!subjectMap[subj]) {
        subjectMap[subj] = {
          subject: subj,
          subjectCode: r.subjectCode || "",
          totalClasses: 0,
          present: 0,
          absent: 0,
          late: 0,
          percentage: 0,
          isEligible: true,
          shortageCount: 0,
        };
      }

      subjectMap[subj].totalClasses += 1;
      if (r.status === "Present") {
        subjectMap[subj].present += 1;
        totalPresent += 1;
      } else if (r.status === "Absent") {
        subjectMap[subj].absent += 1;
        totalAbsent += 1;
      } else if (r.status === "Late") {
        subjectMap[subj].late += 1;
        totalLate += 1;
      }
    });

    const subjectBreakdown = Object.values(subjectMap).map((item) => {
      const pct = item.totalClasses > 0 ? Math.round((item.present / item.totalClasses) * 100) : 0;
      const isEligible = pct >= 75;
      const shortage = isEligible ? 0 : Math.max(0, Math.ceil(3 * item.totalClasses - 4 * item.present));
      return {
        ...item,
        percentage: pct,
        isEligible,
        shortageCount: shortage,
      };
    });

    const totalClasses = records.length;
    const overallPercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;

    return res.status(200).json({
      success: true,
      student: studentUser,
      stats: {
        totalClasses,
        presentClasses: totalPresent,
        absentClasses: totalAbsent,
        lateClasses: totalLate,
        percentage: overallPercentage,
        isEligible: overallPercentage >= 75,
      },
      subjectBreakdown,
      history: records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get subject summary for a section / date.
 */
exports.getSubjectSummary = async (req, res) => {
  try {
    const { subject, date, section, department } = req.query;

    const filter = {};
    if (subject) filter.subject = subject;
    if (date) filter.date = date;
    if (section) filter.section = section;
    if (department) filter.department = department;

    const records = await Attendance.find(filter);
    const total = records.length;
    const present = records.filter((r) => r.status === "Present").length;
    const absent = records.filter((r) => r.status === "Absent").length;
    const late = records.filter((r) => r.status === "Late").length;

    return res.status(200).json({
      success: true,
      subject: subject || "All",
      date: date || "All",
      total,
      present,
      absent,
      late,
      attendancePercentage: total > 0 ? `${Math.round((present / total) * 100)}%` : "0%",
      records,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Update an existing attendance record.
 * Accessible ONLY by Teachers and Administrators.
 */
exports.updateAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;

    const validStatuses = ["Present", "Absent", "Late"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Present, Absent, or Late",
      });
    }

    const update = {
      markedBy: req.user.id,
      markedByName: req.currentUser?.name || "Teacher / Admin",
      markedByRole: req.currentUser?.role || "teacher",
    };

    if (status) {
      update.status = status;
      update.present = status === "Present";
    }

    if (remarks !== undefined) {
      update.remarks = remarks.trim() || "-";
    }

    const updated = await Attendance.findByIdAndUpdate(id, update, { new: true });
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance record updated successfully",
      record: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Delete an attendance record.
 * Accessible ONLY by Teachers and Administrators.
 */
exports.deleteAttendanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Attendance.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Attendance record removed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Re-change or update a student's attendance for a specific subject and date.
 * Accessible ONLY by Teachers and Administrators.
 */
exports.rechangeStudentAttendance = async (req, res) => {
  try {
    const { studentId, subject, subjectCode, department, section, date, status, remarks } = req.body;

    if (!studentId || !subject || !date || !status) {
      return res.status(400).json({
        success: false,
        message: "studentId, subject, date, and status are required to re-change attendance",
      });
    }

    const validStatuses = ["Present", "Absent", "Late"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Present, Absent, or Late",
      });
    }

    const studentUser = await User.findById(studentId);
    if (!studentUser) {
      return res.status(404).json({
        success: false,
        message: "Student user not found",
      });
    }

    const filter = {
      student: studentId,
      subject: subject.trim(),
      date: date.trim(),
    };

    const update = {
      student: studentId,
      studentName: studentUser.name || "Student",
      rollNumber: studentUser.rollNumber || "",
      subject: subject.trim(),
      subjectCode: subjectCode || "",
      department: department || studentUser.department || "CSE",
      section: section || studentUser.section || "A",
      date: date.trim(),
      status,
      present: status === "Present",
      remarks: remarks !== undefined ? String(remarks).trim() : "-",
      markedBy: req.user.id,
      markedByName: req.currentUser?.name || "Teacher / Admin",
      markedByRole: req.currentUser?.role || "teacher",
    };

    const record = await Attendance.findOneAndUpdate(filter, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });

    // Re-calculate subject stats for this student
    const studentRecords = await Attendance.find({ student: studentId, subject: subject.trim() });
    const subTotal = studentRecords.length;
    const subPresent = studentRecords.filter((r) => r.status === "Present").length;
    const subAbsent = studentRecords.filter((r) => r.status === "Absent").length;
    const subLate = studentRecords.filter((r) => r.status === "Late").length;
    const subPct = subTotal > 0 ? Math.round((subPresent / subTotal) * 100) : 0;

    return res.status(200).json({
      success: true,
      message: `Attendance re-changed to ${status} for ${studentUser.name} in ${subject}`,
      record,
      subjectSummary: {
        subject: subject.trim(),
        totalClasses: subTotal,
        presentClasses: subPresent,
        absentClasses: subAbsent,
        lateClasses: subLate,
        percentage: subPct,
        isEligible: subPct >= 75,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

