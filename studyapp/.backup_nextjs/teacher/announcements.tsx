"use client";

import { useState } from "react";
import Link from "next/link";

export default function AnnouncementsPage() {

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const [announcements, setAnnouncements] = useState([
    {
      title: "Assignment Submission Reminder",
      message: "Submit your Data Structures assignment before Friday.",
      date: "05 Oct 2026",
    },
    {
      title: "Class Timing Update",
      message: "Tomorrow's class will start at 10 AM.",
      date: "04 Oct 2026",
    },
  ]);

  function createAnnouncement(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !message) {
      alert("Fill all fields.");
      return;
    }

    setAnnouncements([
      {
        title,
        message,
        date: "07 Oct 2026",
      },
      ...announcements,
    ]);

    setTitle("");
    setMessage("");

    alert("Announcement published.");
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
            Announcements
          </h1>

          <p className="text-slate-500 mt-2">
            Communicate important information to your students.
          </p>

        </div>

        <div className="grid grid-cols-2 gap-6">

          <form
            onSubmit={createAnnouncement}
            className="bg-white rounded-2xl border p-7"
          >

            <h2 className="text-xl font-bold mb-5">
              New Announcement
            </h2>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Announcement title"
              className="w-full border rounded-xl px-4 py-3 mb-4"
            />

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write announcement..."
              rows={7}
              className="w-full border rounded-xl px-4 py-3"
            />

            <button
              className="w-full mt-5 bg-[#071a36] text-white py-3 rounded-xl font-semibold"
            >
              Publish Announcement
            </button>

          </form>

          <div className="bg-white rounded-2xl border">

            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                Recent Announcements
              </h2>
            </div>

            {announcements.map((item, index) => (

              <div
                key={index}
                className="p-5 border-b"
              >

                <h3 className="font-bold">
                  {item.title}
                </h3>

                <p className="text-sm text-slate-500 mt-2">
                  {item.message}
                </p>

                <p className="text-xs text-slate-400 mt-3">
                  {item.date}
                </p>

              </div>

            ))}

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