"use client";

import { useState } from "react";

const receipts = [
  {
    receipt: "REC-001",
    student: "Rahul Kumar",
    roll: "CSE001",
    amount: 25000,
    date: "05 Oct 2026",
    mode: "UPI",
  },
  {
    receipt: "REC-002",
    student: "Priya Singh",
    roll: "CSE002",
    amount: 30000,
    date: "06 Oct 2026",
    mode: "Bank Transfer",
  },
];

export default function FeeReceiptsPage() {

  const [search, setSearch] = useState("");

  const filtered = receipts.filter(
    (item) =>
      item.student
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      item.receipt
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold">
        Fee Receipts
      </h1>

      <p className="text-slate-500 mt-2">
        View and manage student payment receipts.
      </p>

      <div className="bg-white border rounded-2xl p-5 mt-7">

        <input
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search receipt or student..."
          className="w-full border rounded-xl px-4 py-3"
        />

      </div>

      <div className="bg-white border rounded-2xl mt-6 overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>
              <th className="p-4 text-left">Receipt</th>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Roll No</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Date</th>
              <th className="p-4 text-left">Mode</th>
              <th className="p-4 text-left">Action</th>
            </tr>

          </thead>

          <tbody>

            {filtered.map((item) => (
              <tr
                key={item.receipt}
                className="border-t"
              >

                <td className="p-4 font-bold text-cyan-600">
                  {item.receipt}
                </td>

                <td className="p-4 font-semibold">
                  {item.student}
                </td>

                <td className="p-4">
                  {item.roll}
                </td>

                <td className="p-4">
                  ₹{item.amount.toLocaleString()}
                </td>

                <td className="p-4">
                  {item.date}
                </td>

                <td className="p-4">
                  {item.mode}
                </td>

                <td className="p-4">

                  <button
                    onClick={() =>
                      alert(
                        `Receipt ${item.receipt} selected`
                      )
                    }
                    className="bg-cyan-600 text-white px-4 py-2 rounded-lg"
                  >
                    View
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