"use client";

import { useState } from "react";
import Link from "next/link";

export default function MessMenuPage() {

  const [menu, setMenu] = useState([
    {
      meal: "Breakfast",
      food: "Idli, Sambar, Tea",
    },
    {
      meal: "Lunch",
      food: "Rice, Dal, Vegetables",
    },
    {
      meal: "Snacks",
      food: "Samosa, Tea",
    },
    {
      meal: "Dinner",
      food: "Roti, Dal, Paneer",
    },
  ]);

  const [food, setFood] = useState("");

  function updateMenu(meal: string) {
    if (!food) return;

    setMenu(
      menu.map((item) =>
        item.meal === meal
          ? { ...item, food }
          : item
      )
    );

    setFood("");

    alert(`${meal} menu updated.`);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <Header />

        <div className="grid grid-cols-2 gap-6">

          {menu.map((item) => (

            <div
              key={item.meal}
              className="bg-white rounded-2xl border p-6"
            >

              <h2 className="text-xl font-bold">
                {item.meal}
              </h2>

              <p className="text-orange-600 mt-2">
                {item.food}
              </p>

              <div className="flex gap-2 mt-5">

                <input
                  value={food}
                  onChange={(e) => setFood(e.target.value)}
                  placeholder="Update food..."
                  className="flex-1 border rounded-xl px-4 py-3"
                />

                <button
                  onClick={() => updateMenu(item.meal)}
                  className="bg-[#3b2105] text-white px-4 rounded-xl"
                >
                  Update
                </button>

              </div>

            </div>

          ))}

        </div>

      </main>

    </div>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <p className="text-sm text-orange-600 font-semibold">
        Mess Management
      </p>

      <h1 className="text-3xl font-bold mt-1">
        Menu Management
      </h1>

      <p className="text-slate-500 mt-2">
        Manage breakfast, lunch, snacks and dinner.
      </p>
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
            className={`flex gap-3 px-4 py-3 rounded-xl ${
              name === "Menu"
                ? "bg-orange-400 text-[#3b2105] font-semibold"
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