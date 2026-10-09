"use client";

import { useState } from "react";
import Link from "next/link";

export default function StudentDiscussionPage() {

  const [reply, setReply] = useState("");

  const questions = [
    {
      student: "Rahul Kumar",
      question: "Can you explain linked lists again?",
      subject: "Data Structures",
      time: "10 minutes ago",
    },
    {
      student: "Priya Sharma",
      question: "When is the assignment submission?",
      subject: "Python",
      time: "30 minutes ago",
    },
    {
      student: "Aman Das",
      question: "Will arrays be included in the exam?",
      subject: "Data Structures",
      time: "1 hour ago",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">
          <p className="text-sm text-blue-600 font-semibold">
            Teacher Portal
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Student Discussion
          </h1>

          <p className="text-slate-500 mt-2">
            Answer student questions and manage class discussions.
          </p>
        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">
              Student Questions
            </h2>
          </div>

          {questions.map((question, index) => (

            <div
              key={index}
              className="p-6 border-b"
            >

              <div className="flex justify-between">

                <div>

                  <h3 className="font-bold">
                    {question.question}
                  </h3>

                  <p className="text-sm text-blue-600 mt-1">
                    {question.subject}
                  </p>

                  <p className="text-sm text-slate-500 mt-2">
                    Asked by {question.student}
                  </p>

                </div>

                <span className="text-xs text-slate-400">
                  {question.time}
                </span>

              </div>

              <div className="flex gap-3 mt-5">

                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply..."
                  className="flex-1 border rounded-xl px-4 py-3"
                />

                <button
                  onClick={() => {
                    alert("Reply sent.");
                    setReply("");
                  }}
                  className="bg-[#071a36] text-white px-5 rounded-xl"
                >
                  Reply
                </button>

              </div>

            </div>

          ))}

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