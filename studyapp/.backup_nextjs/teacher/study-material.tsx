"use client";

import { useState } from "react";
import Link from "next/link";

export default function StudyMaterialPage() {

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("Data Structures");
  const [file, setFile] = useState<File | null>(null);
  const [materials, setMaterials] = useState([
    {
      title: "Introduction to Arrays",
      subject: "Data Structures",
      type: "PDF",
    },
    {
      title: "Python Functions",
      subject: "Python Programming",
      type: "PDF",
    },
  ]);

  function uploadMaterial(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !file) {
      alert("Enter title and select a file.");
      return;
    }

    setMaterials([
      ...materials,
      {
        title,
        subject,
        type: file.name.split(".").pop()?.toUpperCase() || "FILE",
      },
    ]);

    setTitle("");
    setFile(null);

    alert("Study material uploaded.");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <Header />

        <div className="grid grid-cols-2 gap-6">

          <form
            onSubmit={uploadMaterial}
            className="bg-white p-7 rounded-2xl border"
          >

            <h2 className="text-xl font-bold mb-5">
              Upload Study Material
            </h2>

            <label className="font-semibold text-sm">
              Material Title
            </label>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter material title"
              className="w-full border rounded-xl px-4 py-3 mt-2 mb-5"
            />

            <label className="font-semibold text-sm">
              Subject
            </label>

            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded-xl px-4 py-3 mt-2 mb-5"
            >
              <option>Data Structures</option>
              <option>Python Programming</option>
              <option>Programming Fundamentals</option>
              <option>Database Management</option>
            </select>

            <label className="font-semibold text-sm">
              File
            </label>

            <input
              type="file"
              onChange={(e) =>
                setFile(e.target.files?.[0] || null)
              }
              className="w-full border rounded-xl px-4 py-3 mt-2"
            />

            <button
              type="submit"
              className="w-full mt-6 bg-[#071a36] text-white py-3 rounded-xl font-semibold"
            >
              Upload Material
            </button>

          </form>

          <div className="bg-white rounded-2xl border">

            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                Uploaded Materials
              </h2>
            </div>

            <div className="divide-y">

              {materials.map((material, index) => (

                <div key={index} className="p-5">

                  <h3 className="font-semibold">
                    {material.title}
                  </h3>

                  <p className="text-sm text-slate-500 mt-1">
                    {material.subject}
                  </p>

                  <span className="inline-block mt-3 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                    {material.type}
                  </span>

                </div>

              ))}

            </div>

          </div>

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
        Study Material
      </h1>

      <p className="text-slate-500 mt-2">
        Upload notes, files and learning resources for students.
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
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#071a36] text-white">

      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold">Campusly</h1>
        <p className="text-xs text-blue-300">
          Teacher Portal
        </p>
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