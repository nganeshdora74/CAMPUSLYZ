import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert, Platform } from "react-native";

export interface StudentAttendancePdfItem {
  id?: string;
  num?: number;
  rollNo: string;
  studentName: string;
  monthPresentCount: number;
  totalWorkingDays: number;
  percentage: number;
}

export interface AttendancePdfReportOptions {
  department?: string;
  subject?: string;
  subjectCode?: string;
  section?: string;
  month?: string;
  generatedBy?: string;
  title?: string;
}

/**
 * Escapes HTML characters for safe PDF rendering
 */
function escapeHtml(str: string): string {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Generates official A4 Attendance PDF HTML with only Student Name,
 * Present out of Days, and Attendance Percentage as requested by user.
 */
export function generateAttendanceReportHtml(
  students: StudentAttendancePdfItem[],
  options: AttendancePdfReportOptions = {}
): string {
  const {
    department = "CSE",
    subject = "Data Structures",
    subjectCode = "CSE-301",
    section = "A",
    month = "September 2026",
    generatedBy = "Academic Administration",
    title = "Official Student Attendance & Session Register",
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

  const totalStudents = students.length;
  const workingDays = students[0]?.totalWorkingDays || 24;

  const totalPresent = students.reduce((sum, s) => sum + (s.monthPresentCount || 0), 0);
  const totalPossible = totalStudents * workingDays;
  const avgPercentage = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

  const eligibleCount = students.filter((s) => s.percentage >= 75).length;
  const shortageCount = totalStudents - eligibleCount;

  // Build Table Rows: strictly Name, Present out of Days, and Attendance %
  const tableRowsHtml = students
    .map((s, index) => {
      const isEligible = s.percentage >= 75;
      const statusLabel = isEligible ? "ELIGIBLE" : "SHORTAGE";
      const statusClass = isEligible ? "status-eligible" : "status-shortage";
      const presentDisplay = `${s.monthPresentCount} / ${s.totalWorkingDays} Days`;
      const pctDisplay = `${s.percentage.toFixed(1)}%`;

      return `
        <tr>
          <td class="text-center font-bold">${index + 1}</td>
          <td class="font-bold text-mono">${escapeHtml(s.rollNo || "-")}</td>
          <td>
            <div class="student-name">${escapeHtml(s.studentName || "Student")}</div>
          </td>
          <td class="text-center font-bold text-present">
            ${presentDisplay}
          </td>
          <td class="text-center font-bold ${isEligible ? "text-success" : "text-danger"}">
            ${pctDisplay}
          </td>
          <td class="text-center">
            <span class="status-badge ${statusClass}">${statusLabel}</span>
          </td>
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
      padding: 18px;
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
    
    /* Academic Subject Banner */
    .context-ribbon {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 14px;
      display: table;
      width: 100%;
    }
    .ribbon-cell {
      display: table-cell;
      vertical-align: middle;
      font-size: 10.5px;
      color: #1e40af;
    }
    .ribbon-cell strong {
      color: #0f172a;
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
      width: 25%;
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
    .summary-card.danger {
      background: #fef2f2;
      border-color: #fecaca;
    }
    .card-label {
      font-size: 9.5px;
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
      font-size: 9px;
      color: #64748b;
    }
    
    /* Main Serial Data Table */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 11px;
    }
    .data-table th {
      background: #1e1b4b;
      color: #ffffff;
      padding: 8px 8px;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.5px;
      border: 1px solid #1e1b4b;
    }
    .data-table td {
      padding: 8px 8px;
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
    .student-name { font-weight: 700; color: #0f172a; font-size: 11.5px; }
    .text-present { color: #2563EB; }
    .text-success { color: #059669; }
    .text-danger { color: #dc2626; }
    
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 8.5px;
      letter-spacing: 0.5px;
      text-align: center;
    }
    .status-eligible {
      background: #d1fae5;
      color: #065f46;
    }
    .status-shortage {
      background: #fee2e2;
      color: #991b1b;
    }
    
    /* Footer */
    .report-footer {
      margin-top: 28px;
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
      width: 170px;
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
        <div class="brand-sub">Academic Administration & Student Attendance Registry</div>
        <div class="report-title">${escapeHtml(title)}</div>
      </td>
      <td class="meta-text">
        <div>Date: <strong>${dateFormatted}</strong></div>
        <div>Time: <strong>${timeFormatted}</strong></div>
        <div>Authority: <strong>${escapeHtml(generatedBy)}</strong></div>
        <div>Enrolled: <strong>${totalStudents} Students</strong></div>
      </td>
    </tr>
  </table>

  <!-- Context Ribbon -->
  <div class="context-ribbon">
    <div class="ribbon-cell">
      Department: <strong>${escapeHtml(department)}</strong> &bull; Subject: <strong>${escapeHtml(subject)} (${escapeHtml(subjectCode)})</strong> &bull; Section: <strong>${escapeHtml(section)}</strong> &bull; Register Month: <strong>${escapeHtml(month)}</strong>
    </div>
  </div>

  <!-- Executive Attendance Summary Cards -->
  <div class="summary-grid">
    <div class="summary-card primary">
      <div class="card-label">Total Students</div>
      <div class="card-value" style="color: #1d4ed8;">${totalStudents}</div>
      <div class="card-sub">${workingDays} Total Working Days</div>
    </div>
    <div class="summary-card success">
      <div class="card-label">Overall Class Rate</div>
      <div class="card-value" style="color: #047857;">${avgPercentage}%</div>
      <div class="card-sub">${totalPresent} Present of ${totalPossible}</div>
    </div>
    <div class="summary-card warning">
      <div class="card-label">Eligible (≥ 75%)</div>
      <div class="card-value" style="color: #b45309;">${eligibleCount} Students</div>
      <div class="card-sub">Exam Qualified</div>
    </div>
    <div class="summary-card danger">
      <div class="card-label">Shortage (&lt; 75%)</div>
      <div class="card-value" style="color: #b91c1c;">${shortageCount} Students</div>
      <div class="card-sub">Notice Required</div>
    </div>
  </div>

  <!-- Clean Attendance Data Table (ONLY Name, Present Out of Day, and Attendance %) -->
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 6%;">#</th>
        <th style="width: 18%;">Roll No</th>
        <th style="width: 38%;">Student Name</th>
        <th style="width: 18%; text-align: center;">Present Out of Days</th>
        <th style="width: 10%; text-align: center;">Attendance %</th>
        <th style="width: 10%; text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRowsHtml || '<tr><td colspan="6" class="text-center" style="padding: 24px; color: #94a3b8;">No student attendance records found.</td></tr>'}
    </tbody>
  </table>

  <!-- Footer with Authorized Signature -->
  <div class="report-footer">
    <div class="footer-left">
      <div>&bull; Official academic attendance register certified by University Administration.</div>
      <div>&bull; Synchronized in realtime with Firebase cloud databases. Minimum 75% required for examination hall ticket.</div>
    </div>
    <div class="footer-right">
      <div class="sign-box">
        Authorized Signatory<br />
        <span style="font-weight: 400; font-size: 8.5px; color: #64748b;">Academic Affairs & HOD</span>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Downloads or prints the clean Attendance PDF report on Web and Mobile platforms.
 */
export async function downloadAttendanceReportPdf(
  students: StudentAttendancePdfItem[],
  options: AttendancePdfReportOptions = {}
): Promise<void> {
  try {
    const html = generateAttendanceReportHtml(students, options);

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
      const deptCode = options.department || "Dept";
      const fileName = `Campusly_Attendance_Report_${deptCode}_${dateStr}.pdf`;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: "Save or Share Attendance Report",
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("PDF Generated", `Saved PDF report to: ${file.uri}`);
      }
    }
  } catch (err: any) {
    console.error("Attendance PDF generation error:", err);
    Alert.alert("Report Generation Error", err?.message || "Could not generate attendance PDF report.");
  }
}
