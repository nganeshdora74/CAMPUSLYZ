"use client";

import Link from "next/link";

const classes = [
  {
    name: "CSE 3rd Year",
    subject: "Data Structures",
    students: 62,
    room: "Lab 3",
    time: "09:00 AM",
  },
  {
    name: "CSE 2nd Year",
    subject: "Python Programming",
    students: 58,
    room: "Room 204",
    time: "11:00 AM",
  },
  {
    name: "CSE 1st Year",
    subject: "Programming Fundamentals",
    students: 71,
    room: "Room 102",
    time: "02:00 PM",
  },
];

export default function ClassesPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <Header
          title="My Classes"
          description="Manage your classes, students and teaching schedule."
        />

        <div className="grid grid-cols-3 gap-6">

          {classes.map((item) => (

            <div
              key={item.name}
              className="bg-white rounded-2xl border p-6"
            >

              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-xl">
                📚
              </div>

              <h2 className="font-bold text-lg mt-5">
                {item.name}
              </h2>

              <p className="text-blue-600 mt-1">
                {item.subject}
              </p>

              <div className="mt-5 space-y-2 text-sm text-slate-500">
                <p>👨‍🎓 {item.students} Students</p>
                <p>🏫 {item.room}</p>
                <p>🕐 {item.time}</p>
              </div>

              <button
                onClick={() => alert(`Opening ${item.name}`)}
                className="w-full mt-5 bg-[#071a36] text-white py-3 rounded-xl font-semibold"
              >
                Open Class
              </button>

            </div>

          ))}

        </div>

      </main>

    </div>
  );
}

function Header({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <p className="text-sm text-blue-600 font-semibold">
        Teacher Portal
      </p>

      <h1 className="text-3xl font-bold mt-1">
        {title}
      </h1>

      <p className="text-slate-500 mt-2">
        {description}
      </p>
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
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#071a36] text-white flex flex-col">

      <div className="p-6 border-b border-white/10">

        <h1 className="text-xl font-bold">
          Campusly
        </h1>

        <p className="text-xs text-blue-300 mt-1">
          Teacher Portal
        </p>

      </div>

      <nav className="flex-1 p-4 space-y-2">

        {items.map(([icon, name, href]) => (

          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-300 hover:bg-white/10"
          >
            <span>{icon}</span>
            <span>{name}</span>
          </Link>

        ))}

      </nav>

      <div className="p-5 border-t border-white/10">
        <p className="font-semibold">
          Teacher
        </p>
        <p className="text-xs text-slate-400">
          Academic Department
        </p>
      </div>

    </aside>
  );
}