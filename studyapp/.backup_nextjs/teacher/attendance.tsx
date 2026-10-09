"use client";

import { useState } from "react";
import Link from "next/link";

const students = [
  "Rahul Kumar",
  "Aman Das",
  "Priya Sharma",
  "Sneha Patnaik",
  "Rohit Sahu",
  "Ankit Singh",
];

export default function AttendancePage() {

  const [attendance, setAttendance] = useState<Record<string, string>>(
    {}
  );

  function mark(name: string, value: string) {
    setAttendance({
      ...attendance,
      [name]: value,
    });
  }

  function saveAttendance() {
    alert("Attendance saved successfully.");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-blue-600 font-semibold">
            Teacher Portal
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Attendance
          </h1>

          <p className="text-slate-500 mt-2">
            Mark and monitor student attendance.
          </p>

        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b flex justify-between">

            <div>
              <h2 className="text-xl font-bold">
                Today's Attendance
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                CSE 3rd Year • Data Structures
              </p>
            </div>

            <input
              type="date"
              defaultValue="2026-10-07"
              className="border rounded-xl px-4 py-2"
            />

          </div>

          {students.map((student) => (

            <div
              key={student}
              className="p-5 border-b flex justify-between items-center"
            >

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-semibold text-blue-700">
                  {student
                    .split(" ")
                    .map((x) => x[0])
                    .join("")}
                </div>

                <span className="font-semibold">
                  {student}
                </span>

              </div>

              <div className="flex gap-2">

                <button
                  onClick={() => mark(student, "Present")}
                  className={`px-4 py-2 rounded-lg ${
                    attendance[student] === "Present"
                      ? "bg-green-600 text-white"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  Present
                </button>

                <button
                  onClick={() => mark(student, "Absent")}
                  className={`px-4 py-2 rounded-lg ${
                    attendance[student] === "Absent"
                      ? "bg-red-600 text-white"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  Absent
                </button>

              </div>

            </div>

          ))}

          <div className="p-6">

            <button
              onClick={saveAttendance}
              className="bg-[#071a36] text-white px-6 py-3 rounded-xl font-semibold"
            >
              Save Attendance
            </button>

          </div>

        </div>

      </main>

    </div>
  );
}

function Sidebar() {

  const items = [
    ["🏠", "Dashboard", "/teacher"],
    ["📚", "Classes", "/teacher/classes"],
    ["📖", "Study Material", "/teacher/study-material"],
    ["📝", "Assignments", "/teacher/assignments"],
    ["✅", "Attendance", "/teacher/attendance"],
    ["📅", "Exams", "/teacher/exams"],
    ["📢", "Announcements", "/teacher/announcements"],
    ["💬", "Student Discussion", "/teacher/student-discussion"],
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#071a36] text-white">

      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold">Campusly</h1>
        <p className="text-xs text-blue-300">Teacher Portal</p>
      </div>

      <nav className="p-4 space-y-2">

        {items.map(([icon, name, href]) => (
          <Link
            key={href}
            href={href}
            className="flex gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/10"
          >
            <span>{icon}</span>
            <span>{name}</span>
          </Link>
        ))}

      </nav>

    </aside>
  );
}