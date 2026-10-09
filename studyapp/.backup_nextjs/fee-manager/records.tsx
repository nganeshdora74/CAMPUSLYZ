"use client";

import { useState } from "react";

const students = [
  {
    roll: "CSE001",
    name: "Rahul Kumar",
    course: "CSE",
    year: "1st Year",
    total: 85000,
    paid: 65000,
  },
  {
    roll: "CSE002",
    name: "Priya Singh",
    course: "CSE",
    year: "2nd Year",
    total: 85000,
    paid: 85000,
  },
  {
    roll: "ECE001",
    name: "Amit Das",
    course: "ECE",
    year: "1st Year",
    total: 78000,
    paid: 40000,
  },
];

export default function FeeRecords() {

  const [search, setSearch] = useState("");

  const filtered = students.filter(
    (student) =>
      student.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      student.roll
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold">
        Fee Records
      </h1>

      <p className="text-slate-500 mt-2">
        View and manage student fee records.
      </p>

      <div className="bg-white border rounded-2xl p-5 mt-7">

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search student or roll number..."
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>

      <div className="bg-white border rounded-2xl mt-6 overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>
              <th className="p-4 text-left">Roll No</th>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Course</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Paid</th>
              <th className="p-4 text-left">Due</th>
              <th className="p-4 text-left">Status</th>
            </tr>

          </thead>

          <tbody>

            {filtered.map((student) => {

              const due =
                student.total - student.paid;

              return (
                <tr
                  key={student.roll}
                  className="border-t hover:bg-slate-50"
                >

                  <td className="p-4 font-semibold">
                    {student.roll}
                  </td>

                  <td className="p-4">
                    <p className="font-semibold">
                      {student.name}
                    </p>

                    <p className="text-xs text-slate-400">
                      {student.year}
                    </p>
                  </td>

                  <td className="p-4">
                    {student.course}
                  </td>

                  <td className="p-4">
                    ₹{student.total.toLocaleString()}
                  </td>

                  <td className="p-4 text-green-600 font-semibold">
                    ₹{student.paid.toLocaleString()}
                  </td>

                  <td className="p-4 text-orange-600 font-semibold">
                    ₹{due.toLocaleString()}
                  </td>

                  <td className="p-4">

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        due === 0
                          ? "bg-green-100 text-green-700"
                          : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {due === 0 ? "Paid" : "Pending"}
                    </span>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

    </div>
  );
}