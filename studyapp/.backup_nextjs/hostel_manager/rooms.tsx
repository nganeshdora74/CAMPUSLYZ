"use client";

import { useState } from "react";
import Link from "next/link";

const initialRooms = [
  {
    room: "A-101",
    floor: "1st Floor",
    capacity: 4,
    occupied: 4,
    status: "Full",
  },
  {
    room: "A-102",
    floor: "1st Floor",
    capacity: 4,
    occupied: 3,
    status: "Available",
  },
  {
    room: "A-103",
    floor: "1st Floor",
    capacity: 4,
    occupied: 2,
    status: "Available",
  },
  {
    room: "B-201",
    floor: "2nd Floor",
    capacity: 3,
    occupied: 3,
    status: "Full",
  },
];

export default function RoomsPage() {

  const [rooms, setRooms] = useState(initialRooms);
  const [filter, setFilter] = useState("All");

  const filtered =
    filter === "All"
      ? rooms
      : rooms.filter((room) => room.status === filter);

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-emerald-600 font-semibold">
            Hostel Management
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Rooms
          </h1>

          <p className="text-slate-500 mt-2">
            Manage rooms, capacity and room allocation.
          </p>

        </div>

        <div className="bg-white p-5 rounded-2xl border mb-6">

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border rounded-xl px-4 py-3"
          >
            <option>All</option>
            <option>Available</option>
            <option>Full</option>
          </select>

        </div>

        <div className="grid grid-cols-3 gap-5">

          {filtered.map((room) => (

            <div
              key={room.room}
              className="bg-white rounded-2xl border p-6"
            >

              <div className="flex justify-between">

                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-xl">
                  🚪
                </div>

                <span
                  className={`px-3 py-1 h-fit rounded-full text-xs font-semibold ${
                    room.status === "Full"
                      ? "bg-red-100 text-red-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {room.status}
                </span>

              </div>

              <h2 className="text-xl font-bold mt-5">
                Room {room.room}
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {room.floor}
              </p>

              <div className="mt-5 space-y-2 text-sm">

                <p>
                  Capacity: <b>{room.capacity}</b>
                </p>

                <p>
                  Occupied: <b>{room.occupied}</b>
                </p>

                <p>
                  Available:{" "}
                  <b>{room.capacity - room.occupied}</b>
                </p>

              </div>

              <button
                onClick={() =>
                  alert(`Manage Room ${room.room}`)
                }
                className="w-full mt-5 bg-[#062c24] text-white py-3 rounded-xl font-semibold"
              >
                Manage Room
              </button>

            </div>

          ))}

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
            className={`flex gap-3 px-4 py-3 rounded-xl ${
              name === "Rooms"
                ? "bg-emerald-400 text-[#062c24] font-semibold"
                : "text-slate-300 hover:bg-white/10"
            }`}
          >

            <span>{icon}</span>
            <span>{name}</span>

          </Link>

        ))}

      </nav>

    </aside>
  );
}