"use client";

import { userstate  } from "react";
import { usePathname } from "next/navigation";
import React from "react";

const menuItems = [
  {
    name: "Dashboard",
    href: "/fee-manager",
    icon: "⌂",
  },
  {
    name: "Fee Records",
    href: "/fee-manager/fee-records",
    icon: "▤",
  },
  {
    name: "Collection",
    href: "/fee-manager/collection",
    icon: "₹",
  },
  {
    name: "Pending Dues",
    href: "/fee-manager/pending-dues",
    icon: "◷",
  },
  {
    name: "Payment Status",
    href: "/fee-manager/payment-status",
    icon: "✓",
  },
  {
    name: "Fee Receipts",
    href: "/fee-manager/fee-receipts",
    icon: "▣",
  },
  {
    name: "Reports",
    href: "/fee-manager/reports",
    icon: "▥",
  },
];

export default function FeeManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 bottom-0 w-72 bg-[#061b3a] text-white flex flex-col">

        {/* LOGO */}
        <div className="px-6 py-6 border-b border-white/10">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-xl bg-cyan-500 flex items-center justify-center text-xl font-bold">
              C
            </div>

            <div>
              <h1 className="text-xl font-bold">
                Campusly
              </h1>

              <p className="text-xs text-cyan-300">
                Employee Portal
              </p>
            </div>

          </div>

        </div>

        {/* EMPLOYEE INFORMATION */}
        <div className="px-6 py-5 border-b border-white/10">

          <div className="flex items-center gap-3">

            <div className="w-11 h-11 rounded-full bg-cyan-500 flex items-center justify-center font-bold">
              VS
            </div>

            <div>
              <p className="font-semibold">
                Vikram Singh
              </p>

              <p className="text-xs text-cyan-300">
                Fee Manager
              </p>
            </div>

          </div>

        </div>

        {/* NAVIGATION */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">

          <p className="text-xs uppercase tracking-wider text-cyan-400 px-4 mb-3">
            Fee Management
          </p>

          <div className="space-y-2">

            {menuItems.map((item) => {

              const active =
                item.href === "/fee-manager"
                  ? pathname === "/fee-manager"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition ${
                    active
                      ? "bg-cyan-500 text-white shadow-lg"
                      : "text-cyan-100 hover:bg-white/10"
                  }`}
                >

                  <span className="w-7 text-center text-lg">
                    {item.icon}
                  </span>

                  <span className="font-medium">
                    {item.name}
                  </span>

                </Link>
              );
            })}

          </div>

          {/* PROFILE */}
          <div className="mt-8">

            <p className="text-xs uppercase tracking-wider text-cyan-400 px-4 mb-3">
              Account
            </p>

            <Link
              href="/profile"
              className="flex items-center gap-4 px-4 py-3 rounded-xl text-cyan-100 hover:bg-white/10"
            >
              <span className="w-7 text-center">
                👤
              </span>

              <span>
                My Profile
              </span>
            </Link>

          </div>

        </nav>

        {/* LOGOUT */}
        <div className="p-5 border-t border-white/10">

          <button
            onClick={() => {
              alert("Logout functionality will be connected to authentication.");
            }}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-red-300 hover:bg-red-500/10"
          >
            <span>
              ⇥
            </span>

            <span>
              Logout
            </span>
          </button>

        </div>

      </aside>

      {/* MAIN */}
      <main className="ml-72 min-h-screen">

        {/* TOP BAR */}
        <header className="h-20 bg-white border-b flex items-center justify-between px-8">

          <div>
            <p className="text-sm text-slate-400">
              Employee Portal
            </p>

            <h2 className="font-bold text-slate-800">
              Fee Management
            </h2>
          </div>

          <div className="flex items-center gap-4">

            <div className="relative">
              <button className="w-10 h-10 rounded-xl bg-slate-100">
                🔔
              </button>
            </div>

            <div className="text-right">

              <p className="font-semibold text-sm">
                Vikram Singh
              </p>

              <p className="text-xs text-slate-400">
                Fee Manager
              </p>

            </div>

            <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold">
              VS
            </div>

          </div>

        </header>

        {children}

      </main>

    </div>
  );
}