"use client";

import Link from "next/link";

export default function NoticeReportsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar active="Reports" />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-pink-600 font-semibold">
            Notice Management
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Notice Reports
          </h1>

          <p className="text-slate-500 mt-2">
            Monitor notice activity and publication statistics.
          </p>

        </div>

        {/* STATISTICS */}

        <div className="grid grid-cols-4 gap-5 mb-8">

          <Stat
            title="Total Notices"
            value="248"
            icon="📋"
          />

          <Stat
            title="Published"
            value="186"
            icon="📢"
          />

          <Stat
            title="Scheduled"
            value="24"
            icon="🕐"
          />

          <Stat
            title="Draft"
            value="38"
            icon="📝"
          />

        </div>

        {/* REPORT CARDS */}

        <div className="grid grid-cols-2 gap-6 mb-8">

          <ReportCard
            title="Published Notices"
            value="186"
            percentage="75%"
            description="of all notices have been published"
          />

          <ReportCard
            title="Scheduled Notices"
            value="24"
            percentage="10%"
            description="of all notices are scheduled"
          />

          <ReportCard
            title="Draft Notices"
            value="38"
            percentage="15%"
            description="of all notices are drafts"
          />

          <ReportCard
            title="Campus Notices"
            value="86"
            percentage="35%"
            description="of all notices are campus-wide"
          />

        </div>

        {/* REPORT TABLE */}

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b flex justify-between">

            <div>
              <h2 className="text-xl font-bold">
                Monthly Notice Report
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Notice activity for October 2026
              </p>
            </div>

            <button
              onClick={() => alert("Report downloaded")}
              className="px-5 py-3 bg-[#35051e] text-white rounded-xl font-semibold"
            >
              Download Report
            </button>

          </div>

          <table className="w-full">

            <thead className="bg-slate-50 border-b">

              <tr>
                <th className="text-left p-5">
                  Category
                </th>

                <th className="text-left p-5">
                  Published
                </th>

                <th className="text-left p-5">
                  Scheduled
                </th>

                <th className="text-left p-5">
                  Draft
                </th>

                <th className="text-left p-5">
                  Total
                </th>
              </tr>

            </thead>

            <tbody>

              <tr className="border-b">

                <td className="p-5 font-semibold">
                  Campus
                </td>

                <td className="p-5">72</td>

                <td className="p-5">8</td>

                <td className="p-5">6</td>

                <td className="p-5 font-bold">86</td>

              </tr>

              <tr className="border-b">

                <td className="p-5 font-semibold">
                  Department
                </td>

                <td className="p-5">94</td>

                <td className="p-5">12</td>

                <td className="p-5">18</td>

                <td className="p-5 font-bold">124</td>

              </tr>

              <tr>

                <td className="p-5 font-semibold">
                  Administration
                </td>

                <td className="p-5">20</td>

                <td className="p-5">4</td>

                <td className="p-5">14</td>

                <td className="p-5 font-bold">38</td>

              </tr>

            </tbody>

          </table>

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

function ReportCard({
  title,
  value,
  percentage,
  description,
}: {
  title: string;
  value: string;
  percentage: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-2xl border p-6">

      <div className="flex justify-between">

        <div>

          <p className="text-slate-500 text-sm">
            {title}
          </p>

          <p className="text-3xl font-bold mt-2">
            {value}
          </p>

        </div>

        <div className="text-pink-600 font-bold">
          {percentage}
        </div>

      </div>

      <div className="w-full bg-slate-100 rounded-full h-3 mt-5">

        <div
          className="bg-pink-500 h-3 rounded-full"
          style={{
            width: percentage,
          }}
        />

      </div>

      <p className="text-sm text-slate-500 mt-3">
        {description}
      </p>

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
            <h1 className="text-xl font-bold">
              Campusly
            </h1>

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
            <p className="font-semibold">
              Notice Manager
            </p>

            <p className="text-xs text-slate-400">
              Administration
            </p>
          </div>

        </div>

      </div>

    </aside>
  );
}
