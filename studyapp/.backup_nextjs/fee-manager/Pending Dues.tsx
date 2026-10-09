"use client";

import { useState } from "react";

const dues = [
  {
    roll: "CSE001",
    name: "Rahul Kumar",
    due: 20000,
    date: "15 Oct 2026",
  },
  {
    roll: "ECE001",
    name: "Amit Das",
    due: 38000,
    date: "15 Oct 2026",
  },
  {
    roll: "CSE004",
    name: "Rohit Sahu",
    due: 15000,
    date: "20 Oct 2026",
  },
];

export default function PendingDuesPage() {

  const [search, setSearch] = useState("");

  const filtered = dues.filter(
    (item) =>
      item.name
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.roll
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const total = filtered.reduce(
    (sum, item) => sum + item.due,
    0
  );

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold">
        Pending Dues
      </h1>

      <p className="text-slate-500 mt-2">
        Track outstanding student payments.
      </p>

      <div className="grid grid-cols-2 gap-6 mt-7">

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            Students With Dues
          </p>

          <h2 className="text-3xl font-bold text-orange-600 mt-2">
            {filtered.length}
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            Total Pending
          </p>

          <h2 className="text-3xl font-bold text-red-600 mt-2">
            ₹{total.toLocaleString()}
          </h2>
        </div>

      </div>

      <div className="bg-white border rounded-2xl p-5 mt-7">

        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search student..."
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>

      <div className="bg-white border rounded-2xl mt-6 overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>
              <th className="p-4 text-left">Roll No</th>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Due</th>
              <th className="p-4 text-left">Due Date</th>
              <th className="p-4 text-left">Action</th>
            </tr>

          </thead>

          <tbody>

            {filtered.map((item) => (
              <tr
                key={item.roll}
                className="border-t"
              >

                <td className="p-4 font-semibold">
                  {item.roll}
                </td>

                <td className="p-4">
                  {item.name}
                </td>

                <td className="p-4 text-red-600 font-bold">
                  ₹{item.due.toLocaleString()}
                </td>

                <td className="p-4">
                  {item.date}
                </td>

                <td className="p-4">

                  <button
                    onClick={() =>
                      alert(
                        `Reminder sent to ${item.name}`
                      )
                    }
                    className="bg-orange-500 text-white px-4 py-2 rounded-lg"
                  >
                    Send Reminder
                  </button>

                </td>

              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}