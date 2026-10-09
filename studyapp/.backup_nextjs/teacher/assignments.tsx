"use client";

import { useState } from "react";
import Link from "next/link";

export default function AssignmentsPage() {

  const [assignments, setAssignments] = useState([
    {
      title: "Array Programming",
      subject: "Data Structures",
      due: "10 Oct 2026",
      submissions: 48,
      total: 62,
    },
    {
      title: "Python Functions",
      subject: "Python",
      due: "12 Oct 2026",
      submissions: 35,
      total: 58,
    },
  ]);

  const [title, setTitle] = useState("");

  function createAssignment(e: React.FormEvent) {
    e.preventDefault();

    if (!title) {
      alert("Enter assignment title.");
      return;
    }

    setAssignments([
      ...assignments,
      {
        title,
        subject: "Data Structures",
        due: "20 Oct 2026",
        submissions: 0,
        total: 62,
      },
    ]);

    setTitle("");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <Header />

        <div className="grid grid-cols-3 gap-5 mb-8">

          <Stat title="Assignments" value="18" icon="📝" />
          <Stat title="Submissions" value="142" icon="📥" />
          <Stat title="Pending Review" value="28" icon="⏳" />

        </div>

        <form
          onSubmit={createAssignment}
          className="bg-white p-6 rounded-2xl border mb-6"
        >

          <h2 className="text-xl font-bold mb-4">
            Create Assignment
          </h2>

          <div className="flex gap-3">

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Assignment title"
              className="flex-1 border rounded-xl px-4 py-3"
            />

            <button
              className="bg-[#071a36] text-white px-6 rounded-xl font-semibold"
            >
              Create
            </button>

          </div>

        </form>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">
              Assignments
            </h2>
          </div>

          {assignments.map((item, index) => (

            <div
              key={index}
              className="p-6 border-b flex justify-between"
            >

              <div>

                <h3 className="font-bold">
                  {item.title}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  {item.subject}
                </p>

                <p className="text-sm text-slate-500 mt-1">
                  Due: {item.due}
                </p>

              </div>

              <div className="text-right">

                <p className="font-bold">
                  {item.submissions}/{item.total}
                </p>

                <p className="text-xs text-slate-500">
                  Submissions
                </p>

                <button
                  onClick={() =>
                    alert(`Viewing ${item.title}`)
                  }
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg"
                >
                  View Submissions
                </button>

              </div>

            </div>

          ))}

        </div>

      </main>

    </div>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <p className="text-sm text-blue-600 font-semibold">
        Teacher Portal
      </p>

      <h1 className="text-3xl font-bold mt-1">
        Assignments
      </h1>

      <p className="text-slate-500 mt-2">
        Create assignments, review submissions and manage marks.
      </p>
    </div>
  );
}

function Stat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border flex justify-between">
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold mt-2">{value}</p>
      </div>
      <span className="text-2xl">{icon}</span>
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