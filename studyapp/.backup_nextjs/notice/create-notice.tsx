"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateNoticePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState("All Students");
  const [department, setDepartment] = useState("All Departments");
  const [priority, setPriority] = useState("Normal");
  const [publishType, setPublishType] = useState("Publish Now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !description) {
      setMessage("Please enter notice title and description.");
      return;
    }

    setMessage(
      publishType === "Schedule"
        ? "Notice scheduled successfully."
        : "Notice published successfully."
    );

    setTitle("");
    setDescription("");
    setScheduledDate("");
    setAttachment(null);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* SIDEBAR */}
      <Sidebar active="Create Notice" />

      {/* MAIN */}
      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">
          <p className="text-sm text-pink-600 font-semibold">
            Notice Management
          </p>

          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            Create Notice
          </h1>

          <p className="text-slate-500 mt-2">
            Create and publish an important notice for students and staff.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-xl bg-green-100 text-green-700 p-4 font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">

            <div className="grid grid-cols-2 gap-6">

              {/* TITLE */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-2">
                  Notice Title
                </label>

                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notice title"
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* DESCRIPTION */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-2">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write notice details..."
                  rows={7}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              {/* AUDIENCE */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Audience
                </label>

                <select
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                >
                  <option>All Students</option>
                  <option>Students Only</option>
                  <option>Faculty</option>
                  <option>Staff</option>
                  <option>Students & Faculty</option>
                  <option>Parents</option>
                </select>
              </div>

              {/* DEPARTMENT */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Department
                </label>

                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                >
                  <option>All Departments</option>
                  <option>Computer Science</option>
                  <option>Mechanical Engineering</option>
                  <option>Electrical Engineering</option>
                  <option>Civil Engineering</option>
                  <option>Electronics</option>
                  <option>Administration</option>
                  <option>Finance</option>
                </select>
              </div>

              {/* PRIORITY */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Priority
                </label>

                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                >
                  <option>Normal</option>
                  <option>Important</option>
                  <option>Urgent</option>
                </select>
              </div>

              {/* PUBLISH TYPE */}
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Publish Option
                </label>

                <select
                  value={publishType}
                  onChange={(e) => setPublishType(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                >
                  <option>Publish Now</option>
                  <option>Save as Draft</option>
                  <option>Schedule</option>
                </select>
              </div>

              {/* DATE */}
              {publishType === "Schedule" && (
                <div className="col-span-2">
                  <label className="block text-sm font-semibold mb-2">
                    Scheduled Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3"
                  />
                </div>
              )}

              {/* ATTACHMENT */}
              <div className="col-span-2">
                <label className="block text-sm font-semibold mb-2">
                  Attachment
                </label>

                <input
                  type="file"
                  onChange={(e) =>
                    setAttachment(e.target.files?.[0] || null)
                  }
                  className="w-full border border-slate-300 rounded-xl px-4 py-3"
                />

                {attachment && (
                  <p className="text-sm text-slate-500 mt-2">
                    Selected: {attachment.name}
                  </p>
                )}
              </div>

            </div>

            {/* BUTTONS */}

            <div className="flex justify-end gap-3 mt-8">

              <Link
                href="/notice-manager"
                className="px-6 py-3 rounded-xl border border-slate-300 font-semibold"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-[#35051e] text-white font-semibold hover:bg-[#4a082b]"
              >
                {publishType === "Schedule"
                  ? "Schedule Notice"
                  : publishType === "Save as Draft"
                  ? "Save Draft"
                  : "Publish Notice"}
              </button>

            </div>

          </div>

        </form>

      </main>
    </div>
  );
}

/* SIDEBAR */

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