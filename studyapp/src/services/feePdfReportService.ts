import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

export interface StudentFeeReportItem {
  id: string;
  fullName: string;
  rollNo: string;
  department: string;
  email?: string;
  semester?: string | number;
  totalFees: number;
  paidFees: number;
  remainingFees: number;
  feeStatus: "Paid" | "Partial" | "Pending" | "Overdue";
  lastPaymentDate?: string;
}

export interface FeeReportOptions {
  filter?: "All" | "Cleared" | "Pending";
  departmentFilter?: string;
  generatedBy?: string;
  title?: string;
}

/**
 * Generates an executive-grade, printable A4 HTML report for student fee data.
 * Lists students serially with clear vs pending indicators and financial totals.
 */
export function generateFeeReportHtml(
  students: StudentFeeReportItem[],
  options: FeeReportOptions = {}
): string {
  const {
    filter = "All",
    departmentFilter = "All",
    generatedBy = "Campusly Administration",
    title = "Official Student Fee Status & Dues Report",
  } = options;

  const now = new Date();
  const dateFormatted = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Filter students based on selection
  let displayStudents = [...students];
  if (filter === "Cleared") {
    displayStudents = displayStudents.filter(
      (s) => s.feeStatus === "Paid" || s.remainingFees === 0
    );
  } else if (filter === "Pending") {
    displayStudents = displayStudents.filter(
      (s) => s.feeStatus !== "Paid" && s.remainingFees > 0
    );
  }

  if (departmentFilter && departmentFilter !== "All") {
    displayStudents = displayStudents.filter((s) =>
      s.department.toUpperCase().includes(departmentFilter.toUpperCase())
    );
  }

  // Sort serially by Roll Number or Name
  displayStudents.sort((a, b) => (a.rollNo || "").localeCompare(b.rollNo || ""));

  // Calculate totals
  const totalStudents = students.length;
  const clearedStudents = students.filter(
    (s) => s.feeStatus === "Paid" || s.remainingFees === 0
  ).length;
  const pendingStudents = students.filter(
    (s) => s.feeStatus !== "Paid" && s.remainingFees > 0
  ).length;

  const totalAssessed = students.reduce((sum, s) => sum + (s.totalFees || 0), 0);
  const totalCollected = students.reduce((sum, s) => sum + (s.paidFees || 0), 0);
  const totalOutstanding = students.reduce(
    (sum, s) => sum + (s.remainingFees || 0),
    0
  );

  const clearedPercentage = totalStudents
    ? Math.round((clearedStudents / totalStudents) * 100)
    : 0;

  // Build Table Rows
  const tableRowsHtml = displayStudents
    .map((s, index) => {
      const isCleared = s.feeStatus === "Paid" || s.remainingFees === 0;
      const isPartial = s.feeStatus === "Partial" || (s.paidFees > 0 && s.remainingFees > 0);
      const statusLabel = isCleared ? "CLEARED" : isPartial ? "PARTIAL" : "PENDING";
      const statusClass = isCleared
        ? "status-cleared"
        : isPartial
        ? "status-partial"
        : "status-pending";

      return `
        <tr>
          <td class="text-center font-bold">${index + 1}</td>
          <td class="font-bold text-mono">${escapeHtml(s.rollNo || "-")}</td>
          <td>
            <div class="student-name">${escapeHtml(s.fullName || "Student")}</div>
            <div class="text-muted text-xs">${escapeHtml(s.email || "")}</div>
          </td>
          <td class="text-center">
            <span class="badge-dept">${escapeHtml(s.department || "General")}</span>
            <span class="text-xs text-muted">Sem ${escapeHtml(String(s.semester || 1))}</span>
          </td>
          <td class="text-right">₹${(s.totalFees || 0).toLocaleString("en-IN")}</td>
          <td class="text-right text-success font-bold">₹${(s.paidFees || 0).toLocaleString("en-IN")}</td>
          <td class="text-right text-danger font-bold">₹${(s.remainingFees || 0).toLocaleString("en-IN")}</td>
          <td class="text-center">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </td>
          <td class="text-center text-xs text-muted">${escapeHtml(s.lastPaymentDate || "-")}</td>
        </tr>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 16px;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      color: #4f46e5;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .report-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 6px;
    }
    .meta-text {
      text-align: right;
      font-size: 10px;
      color: #64748b;
    }
    
    /* Metrics Summary Cards */
    .summary-grid {
      display: table;
      width: 100%;
      margin-bottom: 16px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .summary-card {
      display: table-cell;
      width: 33.33%;
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      vertical-align: top;
    }
    .summary-card.primary {
      background: #eff6ff;
      border-color: #bfdbfe;
    }
    .summary-card.success {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .summary-card.warning {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .card-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
    }
    .card-value {
      font-size: 18px;
      font-weight: 800;
      margin: 4px 0 2px;
    }
    .card-sub {
      font-size: 9.5px;
      color: #64748b;
    }
    
    /* Main Serial Data Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 10px;
    }
    .data-table th {
      background: #1e1b4b;
      color: #ffffff;
      padding: 7px 6px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.5px;
      border: 1px solid #1e1b4b;
    }
    .data-table td {
      padding: 6px 6px;
      border-bottom: 1px solid #e2e8f0;
      border-left: 1px solid #f1f5f9;
      border-right: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .data-table tr:nth-child(even) {
      background: #f8fafc;
    }
    
    /* Helpers */
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .text-mono { font-family: Courier, monospace; }
    .text-xs { font-size: 9px; }
    .text-muted { color: #64748b; }
    .text-success { color: #059669; }
    .text-danger { color: #dc2626; }
    .student-name { font-weight: 700; color: #0f172a; }
    
    .badge-dept {
      display: inline-block;
      padding: 2px 5px;
      border-radius: 4px;
      background: #e0e7ff;
      color: #3730a3;
      font-weight: 700;
      font-size: 9px;
    }
    
    .status-badge {
      display: inline-block;
      padding: 3px 6px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 8.5px;
      letter-spacing: 0.5px;
      text-align: center;
    }
    .status-cleared {
      background: #d1fae5;
      color: #065f46;
    }
    .status-partial {
      background: #fef3c7;
      color: #92400e;
    }
    .status-pending {
      background: #fee2e2;
      color: #991b1b;
    }
    
    /* Footer */
    .report-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      display: table;
      width: 100%;
    }
    .footer-left {
      display: table-cell;
      font-size: 9px;
      color: #64748b;
      vertical-align: middle;
    }
    .footer-right {
      display: table-cell;
      text-align: right;
      vertical-align: bottom;
    }
    .sign-box {
      display: inline-block;
      text-align: center;
      border-top: 1px solid #475569;
      width: 160px;
      padding-top: 4px;
      font-weight: 700;
      font-size: 9.5px;
      color: #1e293b;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <table class="header-table">
    <tr>
      <td>
        <div class="brand-title">CAMPUSLY UNIVERSITY</div>
        <div class="brand-sub">Comprehensive Academic Administration & Financial Portal</div>
        <div class="report-title">${escapeHtml(title)}</div>
        <div class="text-muted text-xs" style="margin-top: 3px;">
          Filter Scope: <strong>${escapeHtml(filter)}</strong> &bull; Department: <strong>${escapeHtml(departmentFilter)}</strong>
        </div>
      </td>
      <td class="meta-text">
        <div>Date: <strong>${dateFormatted}</strong></div>
        <div>Time: <strong>${timeFormatted}</strong></div>
        <div>Generated By: <strong>${escapeHtml(generatedBy)}</strong></div>
        <div>Records Listed: <strong>${displayStudents.length} of ${totalStudents}</strong></div>
      </td>
    </tr>
  </table>

  <!-- Executive Summary -->
  <div class="summary-grid">
    <div class="summary-card primary">
      <div class="card-label">Total Registered Students</div>
      <div class="card-value" style="color: #1d4ed8;">${totalStudents} Students</div>
      <div class="card-sub">Assessed: ₹${totalAssessed.toLocaleString("en-IN")}</div>
    </div>
    <div class="summary-card success">
      <div class="card-label">Fees Cleared (Fully Paid)</div>
      <div class="card-value" style="color: #047857;">${clearedStudents} (${clearedPercentage}%)</div>
      <div class="card-sub">Realized: ₹${totalCollected.toLocaleString("en-IN")}</div>
    </div>
    <div class="summary-card warning">
      <div class="card-label">Pending Dues & Defaulters</div>
      <div class="card-value" style="color: #b45309;">${pendingStudents} Students</div>
      <div class="card-sub">Remaining: ₹${totalOutstanding.toLocaleString("en-IN")}</div>
    </div>
  </div>

  <!-- Serialized Data Table -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">S.No</th>
        <th style="width: 12%;">Roll No</th>
        <th style="width: 26%;">Student Details</th>
        <th style="width: 12%;">Department</th>
        <th style="width: 11%; text-align: right;">Total Fee</th>
        <th style="width: 11%; text-align: right;">Paid Amount</th>
        <th style="width: 11%; text-align: right;">Pending Due</th>
        <th style="width: 8%; text-align: center;">Status</th>
        <th style="width: 5%; text-align: center;">Last Paid</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml || '<tr><td colspan="9" class="text-center" style="padding: 24px; color: #94a3b8;">No matching student fee records found.</td></tr>'}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="report-footer">
    <div class="footer-left">
      <div>&bull; Official system-generated audit report. All records synchronized with Firebase & MongoDB.</div>
      <div>&bull; Confidential document for authorized administrative use only.</div>
    </div>
    <div class="footer-right">
      <div class="sign-box">
        Authorized Signatory<br />
        <span style="font-weight: 400; font-size: 8.5px; color: #64748b;">Finance & Accounts Office</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Downloads or prints the serialized PDF report on both Web and Mobile platforms.
 */
export async function downloadFeeReportPdf(
  students: StudentFeeReportItem[],
  options: FeeReportOptions = {}
): Promise<void> {
  try {
    const html = generateFeeReportHtml(students, options);

    if (Platform.OS === "web") {
      // Trigger native browser print-to-pdf dialog
      await Print.printAsync({ html });
    } else {
      // Mobile: Generate PDF file and trigger share sheet
      const file = await Print.printToFileAsync({
        html,
        width: 595, // A4 portrait points
        height: 842,
      });

      const dateStr = new Date().toISOString().split("T")[0];
      const fileName = `Campusly_Fee_Report_${options.filter || "All"}_${dateStr}.pdf`;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: "Save or Share Fee Status Report",
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Generated", `Saved PDF report to: ${file.uri}`);
      }
    }
  } catch (err: any) {
    console.error("PDF generation error:", err);
    Alert.alert("Report Generation Error", err?.message || "Could not generate PDF report.");
  }
}
