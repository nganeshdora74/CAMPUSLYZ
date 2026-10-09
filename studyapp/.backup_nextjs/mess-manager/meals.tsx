"use client";

import Link from "next/link";

const meals = [
  {
    name: "Breakfast",
    served: 620,
    expected: 684,
    status: "Completed",
  },
  {
    name: "Lunch",
    served: 651,
    expected: 684,
    status: "Completed",
  },
  {
    name: "Snacks",
    served: 580,
    expected: 684,
    status: "Upcoming",
  },
  {
    name: "Dinner",
    served: 0,
    expected: 684,
    status: "Upcoming",
  },
];

export default function MealsPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex">

      <Sidebar />

      <main className="ml-72 flex-1 p-10">

        <div className="mb-8">

          <p className="text-sm text-orange-600 font-semibold">
            Mess Management
          </p>

          <h1 className="text-3xl font-bold mt-1">
            Today's Meals
          </h1>

          <p className="text-slate-500 mt-2">
            Monitor meal usage and student meal counts.
          </p>

        </div>

        <div className="grid grid-cols-4 gap-5 mb-8">

          <Stat title="Expected" value="684" icon="👨‍🎓" />
          <Stat title="Served" value="1,271" icon="🍽️" />
          <Stat title="Completed" value="2" icon="✅" />
          <Stat title="Upcoming" value="2" icon="⏳" />

        </div>

        <div className="bg-white rounded-2xl border overflow-hidden">

          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">
              Meal Tracking
            </h2>
          </div>

          {meals.map((meal) => (

            <div
              key={meal.name}
              className="p-6 border-b flex justify-between"
            >

              <div>

                <h3 className="font-bold">
                  {meal.name}
                </h3>

                <p className="text-sm text-slate-500 mt-1">
                  Expected: {meal.expected}
                </p>

              </div>

              <div className="text-right">

                <p className="font-bold">
                  {meal.served}
                </p>

                <p className="text-xs text-slate-500">
                  Served
                </p>

                <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                  {meal.status}
                </span>

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