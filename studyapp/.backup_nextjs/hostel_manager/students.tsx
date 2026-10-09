"use client";

import { useState } from "react";
import Link from "next/link";

const initialStudents = [
  {
    name: "Rahul Kumar",
    roll: "CSE001",
    room: "A-101",
    year: "3rd Year",
  },
  {
    name: "Aman Das",
    roll: "CSE024",
    room: "A-102",
    year: "2nd Year",
  },
  {
    name: "Priya Sharma",
    roll: "CSE045",
    room: "A-103",
    year: "3rd Year",
  },
  {
    name: "Sneha Patnaik",
    roll: "ECE012",
    room: "B-201",
    year: "2nd Year",
  },
];

export default function HostelStudentsPage() {

  const [search, setSearch] = useState("");

  const students = initialStudents.filter(
    (student) =>
      student.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      student.roll
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-emerald-600 font-semibold">
            Hostel Management
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Hostel Students
          </h1>

          <p className="text-slate-500 mt-2">
            Manage hostel residents and room allocation.
          </p>

        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student or roll number..."
              className="w-full border rounded-xl px-4 py-3"
            />

          </div>

          <table className="w-full">

            <thead className="bg-slate-50">

              <tr>

                <th className="text-left p-5">
                  Student
                </th>

                <th className="text-left p-5">
                  Roll Number
                </th>

                <th className="text-left p-5">
                  Year
                </th>

                <th className="text-left p-5">
                  Room
                </th>

                <th className="text-left p-5">
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {students.map((student) => (

                <tr
                  key={student.roll}
                  className="border-t"
                >

                  <td className="p-5 font-semibold">
                    {student.name}
                  </td>

                  <td className="p-5">
                    {student.roll}
                  </td>

                  <td className="p-5">
                    {student.year}
                  </td>

                  <td className="p-5">
                    {student.room}
                  </td>

                  <td className="p-5">

                    <button
                      onClick={() =>
                        alert(`Managing ${student.name}`)
                      }
                      className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg"
                    >
                      Manage
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </main>

    </div>
  );
}

function Sidebar() {

  const items = [
    ["🏠", "Dashboard", "/hostel-manager"],
    ["🚪", "Rooms", "/hostel-manager/rooms"],
    ["👨‍🎓", "Students", "/hostel-manager/students"],
    ["📊", "Occupancy", "/hostel-manager/occupancy"],
    ["🔧", "Requests", "/hostel-manager/requests"],
    ["📢", "Hostel Notices", "/hostel-manager/hostel-notices"],
    ["📈", "Reports", "/hostel-manager/reports"],
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#062c24] text-white">

      <div className="p-6 border-b border-white/10">

        <h1 className="text-xl font-bold">
          Campusly
        </h1>

        <p className="text-xs text-emerald-300">
          Hostel Management
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
