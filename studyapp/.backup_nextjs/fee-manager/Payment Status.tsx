const payments = [
  {
    name: "Rahul Kumar",
    roll: "CSE001",
    total: 85000,
    paid: 65000,
    status: "Partial",
  },
  {
    name: "Priya Singh",
    roll: "CSE002",
    total: 85000,
    paid: 85000,
    status: "Paid",
  },
  {
    name: "Amit Das",
    roll: "ECE001",
    total: 78000,
    paid: 40000,
    status: "Partial",
  },
  {
    name: "Rohit Sahu",
    roll: "CSE004",
    total: 85000,
    paid: 0,
    status: "Unpaid",
  },
];

export default function PaymentStatusPage() {

  const paid = payments.filter(
    (x) => x.status === "Paid"
  ).length;

  const partial = payments.filter(
    (x) => x.status === "Partial"
  ).length;

  const unpaid = payments.filter(
    (x) => x.status === "Unpaid"
  ).length;

  return (
    <div className="p-8">

      <h1 className="text-3xl font-bold">
        Payment Status
      </h1>

      <p className="text-slate-500 mt-2">
        Monitor student payment status.
      </p>

      <div className="grid grid-cols-3 gap-6 mt-7">

        <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
          <p className="text-green-700">
            Fully Paid
          </p>

          <h2 className="text-4xl font-bold text-green-700 mt-2">
            {paid}
          </h2>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6">
          <p className="text-orange-700">
            Partial
          </p>

          <h2 className="text-4xl font-bold text-orange-700 mt-2">
            {partial}
          </h2>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
          <p className="text-red-700">
            Unpaid
          </p>

          <h2 className="text-4xl font-bold text-red-700 mt-2">
            {unpaid}
          </h2>
        </div>

      </div>

      <div className="bg-white border rounded-2xl mt-7 overflow-hidden">

        <table className="w-full">

          <thead className="bg-slate-100">

            <tr>
              <th className="p-4 text-left">Student</th>
              <th className="p-4 text-left">Roll No</th>
              <th className="p-4 text-left">Total</th>
              <th className="p-4 text-left">Paid</th>
              <th className="p-4 text-left">Remaining</th>
              <th className="p-4 text-left">Status</th>
            </tr>

          </thead>

          <tbody>

            {payments.map((item) => {

              const remaining =
                item.total - item.paid;

              return (
                <tr
                  key={item.roll}
                  className="border-t"
                >

                  <td className="p-4 font-semibold">
                    {item.name}
                  </td>

                  <td className="p-4">
                    {item.roll}
                  </td>

                  <td className="p-4">
                    ₹{item.total.toLocaleString()}
                  </td>

                  <td className="p-4 text-green-600">
                    ₹{item.paid.toLocaleString()}
                  </td>

                  <td className="p-4 text-red-600">
                    ₹{remaining.toLocaleString()}
                  </td>

                  <td className="p-4">

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === "Paid"
                          ? "bg-green-100 text-green-700"
                          : item.status === "Partial"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>

                  </td>

                </tr>
              );
            })}

          </tbody>

        </table>

      </div>

    </div>
  );
}