"use client";

import { useState } from "react";
import Link from "next/link";

const departments = [
  "Computer Science",
  "Mechanical Engineering",
  "Electrical Engineering",
  "Civil Engineering",
  "Electronics",
  "Administration",
  "Finance",
];

const notices = [
  {
    id: 1,
    title: "CSE Internal Examination",
    department: "Computer Science",
    audience: "CSE Students",
    date: "05 Oct 2026",
    status: "Published",
  },
  {
    id: 2,
    title: "Mechanical Lab Schedule",
    department: "Mechanical Engineering",
    audience: "Mechanical Students",
    date: "04 Oct 2026",
    status: "Published",
  },
  {
    id: 3,
    title: "Finance Department Meeting",
    department: "Finance",
    audience: "Finance Staff",
    date: "03 Oct 2026",
    status: "Published",
  },
  {
    id: 4,
    title: "Electrical Lab Maintenance",
    department: "Electrical Engineering",
    audience: "Electrical Students",
    date: "02 Oct 2026",
    status: "Draft",
  },
];

export default function DepartmentNoticesPage() {
  const [selectedDepartment, setSelectedDepartment] =
    useState("All Departments");

  const filtered =
    selectedDepartment === "All Departments"
      ? notices
      : notices.filter(
          (notice) => notice.department === selectedDepartment
        );

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar active="Department Notices" />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-pink-600 font-semibold">
            Notice Management
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Department Notices
          </h1>

          <p className="text-slate-500 mt-2">
            View notices belonging to specific departments.
          </p>

        </div>

        <div className="bg-white rounded-2xl border p-6 mb-6">

          <label className="block font-semibold mb-2">
            Select Department
          </label>

          <select
            value={selectedDepartment}
            onChange={(e) =>
              setSelectedDepartment(e.target.value)
            }
            className="border rounded-xl px-4 py-3 w-full max-w-md"
          >
            <option>All Departments</option>

            {departments.map((department) => (
              <option key={department}>
                {department}
              </option>
            ))}

          </select>

        </div>

        <div className="grid grid-cols-3 gap-5 mb-8">

          <Stat
            title="Department Notices"
            value={filtered.length.toString()}
            icon="🏢"
          />

          <Stat
            title="Published"
            value="18"
            icon="📢"
          />

          <Stat
            title="Departments"
            value={departments.length.toString()}
            icon="👥"
          />

        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b">

            <h2 className="text-xl font-bold">
              Department Notices
            </h2>

          </div>

          <div className="divide-y">

            {filtered.map((notice) => (

              <div
                key={notice.id}
                className="p-6 flex justify-between hover:bg-slate-50"
              >

                <div>

                  <h3 className="font-bold">
                    {notice.title}
                  </h3>

                  <p className="text-sm text-slate-500 mt-2">
                    🏢 {notice.department}
                  </p>

                  <p className="text-sm text-slate-500 mt-1">
                    👥 {notice.audience}
                  </p>

                </div>

                <div className="text-right">

                  <p className="text-sm text-slate-500">
                    {notice.date}
                  </p>

                  <span className="inline-block mt-3 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                    {notice.status}
                  </span>

                </div>

              </div>

            ))}

          </div>

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
    <div className="bg-white p-6 rounded-2xl border">

      <div className="flex justify-between">

        <div>
          <p className="text-sm text-slate-500">
            {title}
          </p>

          <p className="text-2xl font-bold mt-2">
            {value}
          </p>
        </div>

        <span className="text-2xl">
          {icon}
        </span>

      </div>

    </div>
  );
}

function Sidebar({ active }: { active: string }) {
  const items = [
    ["🏠", "Dashboard", "/notice-manager"],
    ["✏️", "Create Notice", "/notice-manager/create-notice"],
    ["📋", "Manage Notices", "/notice-manager/manage-notices"],
    ["🕐", "Scheduled Notices", "/notice-manager/scheduled-notices"],
    ["🏢", "Department Notices", "/notice-manager/department-notices"],
    ["🏫", "Campus Notices", "/notice-manager/campus-notices"],
    ["📊", "Reports", "/notice-manager/reports"],
  ];

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#35051e] text-white flex flex-col">

      <div className="p-6 border-b border-white/10">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-xl bg-pink-400 flex items-center justify-center text-xl font-bold text-[#35051e]">
            C
          </div>

          <div>
            <h1 className="text-xl font-bold">Campusly</h1>
            <p className="text-xs text-pink-300">
              Notice Operations
            </p>
          </div>

        </div>

      </div>

      <nav className="flex-1 p-4 space-y-2">

        {items.map(([icon, name, href]) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
              active === name
                ? "bg-pink-400 text-[#35051e] font-semibold"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <span>{icon}</span>
            <span>{name}</span>
          </Link>
        ))}

      </nav>

      <div className="p-5 border-t border-white/10">

        <div className="flex items-center gap-3">

          <div className="w-11 h-11 rounded-full bg-pink-400 text-[#35051e] flex items-center justify-center font-bold">
            NM
          </div>

          <div>
            <p className="font-semibold">Notice Manager</p>
            <p className="text-xs text-slate-400">
              Administration
            </p>
          </div>

        </div>

      </div>

    </aside>
  );
}