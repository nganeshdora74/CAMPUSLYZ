"use client";

import Link from "next/link";

const exams = [
  {
    name: "Mid Semester Examination",
    subject: "Data Structures",
    date: "15 Oct 2026",
    time: "10:00 AM",
    room: "Exam Hall 1",
  },
  {
    name: "Internal Assessment",
    subject: "Python Programming",
    date: "18 Oct 2026",
    time: "11:00 AM",
    room: "Room 204",
  },
  {
    name: "Practical Examination",
    subject: "Programming Lab",
    date: "20 Oct 2026",
    time: "09:00 AM",
    room: "Computer Lab",
  },
];

export default function ExamsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-blue-600 font-semibold">
            Teacher Portal
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Exams
          </h1>

          <p className="text-slate-500 mt-2">
            Manage examination schedules and student marks.
          </p>

        </div>

        <div className="grid grid-cols-3 gap-5 mb-8">

          <Stat title="Upcoming Exams" value="6" icon="📅" />
          <Stat title="Subjects" value="4" icon="📚" />
          <Stat title="Marks Pending" value="18" icon="📝" />

        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">
              Examination Schedule
            </h2>
          </div>

          {exams.map((exam, index) => (

            <div
              key={index}
              className="p-6 border-b flex justify-between"
            >

              <div>

                <h3 className="font-bold">
                  {exam.name}
                </h3>

                <p className="text-blue-600 mt-1">
                  {exam.subject}
                </p>

                <p className="text-sm text-slate-500 mt-2">
                  🏫 {exam.room}
                </p>

              </div>

              <div className="text-right">

                <p className="font-semibold">
                  {exam.date}
                </p>

                <p className="text-sm text-slate-500">
                  {exam.time}
                </p>

                <button
                  onClick={() =>
                    alert(`Marks: ${exam.subject}`)
                  }
                  className="mt-3 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg"
                >
                  Manage Marks
                </button>

              </div>

            </div>

          ))}

        </div>

      </main>

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