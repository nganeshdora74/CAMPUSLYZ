"use client";

import { useState } from "react";

export default function CollectionPage() {

  const [student, setStudent] = useState("");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("UPI");

  const recordPayment = () => {

    if (!student || !amount) {
      alert("Please enter student and amount.");
      return;
    }

    alert(
      `₹${amount} payment recorded for ${student} via ${mode}.`
    );

    setStudent("");
    setAmount("");
  };

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold">
        Fee Collection
      </h1>

      <p className="text-slate-500 mt-2">
        Record and monitor student payments.
      </p>

      <div className="grid grid-cols-3 gap-6 mt-7">

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            Today's Collection
          </p>

          <h2 className="text-3xl font-bold text-green-600 mt-2">
            ₹85,000
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            This Month
          </p>

          <h2 className="text-3xl font-bold text-cyan-600 mt-2">
            ₹6.5L
          </h2>
        </div>

        <div className="bg-white border rounded-2xl p-6">
          <p className="text-slate-500">
            Transactions
          </p>

          <h2 className="text-3xl font-bold mt-2">
            128
          </h2>
        </div>

      </div>

      <div className="bg-white border rounded-2xl p-7 mt-7 max-w-2xl">

        <h2 className="text-xl font-bold">
          Record Payment
        </h2>

        <div className="space-y-5 mt-6">

          <div>
            <label className="block font-medium mb-2">
              Student
            </label>

            <input
              value={student}
              onChange={(e) =>
                setStudent(e.target.value)
              }
              placeholder="Student name or roll number"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Amount
            </label>

            <input
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value)
              }
              type="number"
              placeholder="Enter amount"
              className="w-full border rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block font-medium mb-2">
              Payment Mode
            </label>

            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value)
              }
              className="w-full border rounded-xl px-4 py-3"
            >
              <option>UPI</option>
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Card</option>
              <option>Cheque</option>
            </select>
          </div>

          <button
            onClick={recordPayment}
            className="w-full bg-cyan-600 text-white py-3 rounded-xl font-semibold"
          >
            Record Payment
          </button>

        </div>

      </div>

    </div>
  );
}