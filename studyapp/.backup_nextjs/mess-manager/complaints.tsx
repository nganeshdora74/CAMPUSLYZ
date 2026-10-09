"use client";

import { useState } from "react";
import Link from "next/link";

export default function ComplaintsPage() {

  const [complaints, setComplaints] = useState([
    {
      id: "MC001",
      student: "Rahul Kumar",
      issue: "Food was too spicy",
      date: "07 Oct 2026",
      status: "Pending",
    },
    {
      id: "MC002",
      student: "Priya Sharma",
      issue: "Dinner was served late",
      date: "06 Oct 2026",
      status: "Resolved",
    },
    {
      id: "MC003",
      student: "Aman Das",
      issue: "Water quality issue",
      date: "06 Oct 2026",
      status: "Pending",
    },
  ]);

  function resolve(id: string) {
    setComplaints(
      complaints.map((item) =>
        item.id === id
          ? { ...item, status: "Resolved" }
          : item
      )
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-orange-600 font-semibold">
            Mess Management
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Mess Complaints
          </h1>

          <p className="text-slate-500 mt-2">
            Review and resolve student food and service complaints.
          </p>

        </div>

        <div className="grid grid-cols-3 gap-5 mb-8">

          <Stat title="Total Complaints" value="32" icon="⚠️" />
          <Stat title="Pending" value="12" icon="⏳" />
          <Stat title="Resolved" value="20" icon="✅" />

        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">
              Complaint History
            </h2>
          </div>

          {complaints.map((complaint) => (

            <div
              key={complaint.id}
              className="p-6 border-b flex justify-between"
            >

              <div>

                <h3 className="font-bold">
                  {complaint.issue}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  {complaint.student} • {complaint.id}
                </p>

                <p className="text-xs text-slate-400 mt-2">
                  {complaint.date}
                </p>

              </div>

              <div>

                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    complaint.status === "Resolved"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {complaint.status}
                </span>

                {complaint.status === "Pending" && (
                  <button
                    onClick={() => resolve(complaint.id)}
                    className="ml-3 px-4 py-2 bg-green-100 text-green-700 rounded-lg"
                  >
                    Resolve
                  </button>
                )}

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
    ["🏠", "Dashboard", "/mess-manager"],
    ["🍛", "Menu", "/mess-manager/menu"],
    ["🍽️", "Meals", "/mess-manager/meals"],
    ["👨‍🎓", "Students", "/mess-manager/students"],
    ["⚠️", "Complaints", "/mess-manager/complaints"],
    ["📦", "Inventory", "/mess-manager/inventory"],
    ["📊", "Reports", "/mess-manager/reports"],
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#3b2105] text-white">

      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold">Campusly</h1>
        <p className="text-xs text-orange-300">
          Mess Management
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