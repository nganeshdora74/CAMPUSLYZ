"use client";

import Link from "next/link";

const campusNotices = [
  {
    title: "Semester Examination Schedule",
    category: "Academic",
    audience: "All Students",
    date: "05 Oct 2026",
    priority: "Important",
  },
  {
    title: "Annual Sports Day",
    category: "Event",
    audience: "Entire Campus",
    date: "04 Oct 2026",
    priority: "Normal",
  },
  {
    title: "Campus Holiday Notice",
    category: "Administration",
    audience: "Students & Staff",
    date: "02 Oct 2026",
    priority: "Important",
  },
  {
    title: "Emergency Campus Announcement",
    category: "Important",
    audience: "Everyone",
    date: "01 Oct 2026",
    priority: "Urgent",
  },
];

export default function CampusNoticesPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar active="Campus Notices" />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-pink-600 font-semibold">
            Notice Management
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Campus Notices
          </h1>

          <p className="text-slate-500 mt-2">
            Manage notices visible to the entire campus.
          </p>

        </div>

        <div className="grid grid-cols-3 gap-5 mb-8">

          <Stat
            title="Campus Notices"
            value="86"
            icon="🏫"
          />

          <Stat
            title="Published"
            value="72"
            icon="📢"
          />

          <Stat
            title="Important"
            value="14"
            icon="⚠️"
          />

        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b flex justify-between">

            <div>
              <h2 className="text-xl font-bold">
                College-wide Notices
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Notices visible across the campus
              </p>
            </div>

            <Link
              href="/notice-manager/create-notice"
              className="bg-[#35051e] text-white px-5 py-3 rounded-xl font-semibold"
            >
              + Create Notice
            </Link>

          </div>

          <div className="divide-y">

            {campusNotices.map((notice, index) => (

              <div
                key={index}
                className="p-6 flex justify-between hover:bg-slate-50"
              >

                <div className="flex gap-4">

                  <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-xl">
                    📢
                  </div>

                  <div>

                    <h3 className="font-bold">
                      {notice.title}
                    </h3>

                    <p className="text-sm text-slate-500 mt-2">
                      {notice.category} • {notice.audience}
                    </p>

                  </div>

                </div>

                <div className="text-right">

                  <p className="text-sm text-slate-500">
                    {notice.date}
                  </p>

                  <span
                    className={`inline-block mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
                      notice.priority === "Urgent"
                        ? "bg-red-100 text-red-700"
                        : notice.priority === "Important"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {notice.priority}
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