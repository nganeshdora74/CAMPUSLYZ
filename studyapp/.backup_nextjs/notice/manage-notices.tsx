"use client";

import { useState } from "react";
import Link from "next/link";

type Notice = {
  id: number;
  title: string;
  department: string;
  audience: string;
  priority: string;
  date: string;
  status: string;
};

const initialNotices: Notice[] = [
  {
    id: 1,
    title: "Semester Examination Schedule",
    department: "Academic",
    audience: "All Students",
    priority: "Important",
    date: "05 Oct 2026",
    status: "Published",
  },
  {
    id: 2,
    title: "Fee Payment Reminder",
    department: "Finance",
    audience: "Students",
    priority: "Urgent",
    date: "04 Oct 2026",
    status: "Published",
  },
  {
    id: 3,
    title: "Library Timing Update",
    department: "Administration",
    audience: "All Students",
    priority: "Normal",
    date: "03 Oct 2026",
    status: "Draft",
  },
  {
    id: 4,
    title: "Holiday Notice",
    department: "Administration",
    audience: "All Students",
    priority: "Important",
    date: "02 Oct 2026",
    status: "Unpublished",
  },
];

export default function ManageNoticesPage() {
  const [notices, setNotices] = useState(initialNotices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredNotices = notices.filter((notice) => {
    const matchesSearch =
      notice.title.toLowerCase().includes(search.toLowerCase()) ||
      notice.department.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || notice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function togglePublish(id: number) {
    setNotices((current) =>
      current.map((notice) =>
        notice.id === id
          ? {
              ...notice,
              status:
                notice.status === "Published"
                  ? "Unpublished"
                  : "Published",
            }
          : notice
      )
    );
  }

  function deleteNotice(id: number) {
    if (confirm("Are you sure you want to delete this notice?")) {
      setNotices((current) =>
        current.filter((notice) => notice.id !== id)
      );
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar active="Manage Notices" />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-pink-600 font-semibold">
            Notice Management
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Manage Notices
          </h1>

          <p className="text-slate-500 mt-2">
            Search, edit, publish and manage all notices.
          </p>

        </div>

        {/* SEARCH / FILTER */}

        <div className="bg-white p-5 rounded-2xl border mb-6 flex gap-4">

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notices..."
            className="flex-1 border rounded-xl px-4 py-3"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded-xl px-4 py-3"
          >
            <option>All</option>
            <option>Published</option>
            <option>Unpublished</option>
            <option>Draft</option>
          </select>

          <Link
            href="/notice-manager/create-notice"
            className="bg-[#35051e] text-white px-5 py-3 rounded-xl font-semibold"
          >
            + Create
          </Link>

        </div>

        {/* TABLE */}

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead className="bg-slate-50 border-b">

                <tr>
                  <th className="text-left p-5">Notice</th>
                  <th className="text-left p-5">Department</th>
                  <th className="text-left p-5">Audience</th>
                  <th className="text-left p-5">Priority</th>
                  <th className="text-left p-5">Status</th>
                  <th className="text-left p-5">Actions</th>
                </tr>

              </thead>

              <tbody>

                {filteredNotices.map((notice) => (

                  <tr
                    key={notice.id}
                    className="border-b hover:bg-slate-50"
                  >

                    <td className="p-5">

                      <p className="font-semibold">
                        {notice.title}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        {notice.date}
                      </p>

                    </td>

                    <td className="p-5 text-sm">
                      {notice.department}
                    </td>

                    <td className="p-5 text-sm">
                      {notice.audience}
                    </td>

                    <td className="p-5">
                      <span className="text-sm">
                        {notice.priority}
                      </span>
                    </td>

                    <td className="p-5">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          notice.status === "Published"
                            ? "bg-green-100 text-green-700"
                            : notice.status === "Draft"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {notice.status}
                      </span>
                    </td>

                    <td className="p-5">

                      <div className="flex gap-2">

                        <button
                          onClick={() =>
                            alert(`Edit: ${notice.title}`)
                          }
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => togglePublish(notice.id)}
                          className="px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm"
                        >
                          {notice.status === "Published"
                            ? "Unpublish"
                            : "Publish"}
                        </button>

                        <button
                          onClick={() => deleteNotice(notice.id)}
                          className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm"
                        >
                          Delete
                        </button>

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>

      </main>

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