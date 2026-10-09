import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Alert, Platform } from "react-native";

export interface ReportKpiItem {
  label: string;
  value: string | number;
  subtext?: string;
}

export interface ReportSectionData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ReportDataPayload {
  reportTitle: string;
  reportSubtitle?: string;
  generatedBy?: string;
  generatedDate?: string;
  kpis: ReportKpiItem[];
  sections: ReportSectionData[];
}

/**
 * Escapes characters for HTML output.
 */
function escapeHtml(str: any): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Builds HTML representation of the executive report.
 */
export function generateReportHtml(data: ReportDataPayload): string {
  const now = new Date();
  const dateFormatted =
    data.generatedDate ||
    now.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  const timeFormatted = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const kpisHtml = data.kpis
    .map(
      (kpi) => `
      <div class="kpi-card">
        <div class="kpi-label">${escapeHtml(kpi.label)}</div>
        <div class="kpi-val">${escapeHtml(kpi.value)}</div>
        ${kpi.subtext ? `<div class="kpi-sub">${escapeHtml(kpi.subtext)}</div>` : ""}
      </div>
    `
    )
    .join("");

  const sectionsHtml = data.sections
    .map((sec) => {
      const headerCols = sec.headers
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join("");

      const rowsHtml =
        sec.rows.length > 0
          ? sec.rows
              .map(
                (row, idx) => `
            <tr>
              ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
            </tr>
          `
              )
              .join("")
          : `<tr><td colspan="${sec.headers.length}" style="text-align:center; padding: 18px; color: #94a3b8;">No records found</td></tr>`;

      return `
        <div class="section-card">
          <div class="section-title">${escapeHtml(sec.title)}</div>
          <table>
            <thead>
              <tr>${headerCols}</tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.reportTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm 14mm 16mm 14mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-col h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-col p {
      margin: 3px 0 0;
      font-size: 11px;
      color: #475569;
    }
    .meta-col {
      text-align: right;
      font-size: 10px;
      color: #64748b;
    }
    .meta-col strong {
      color: #0f172a;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 700;
      font-size: 9.5px;
      margin-bottom: 4px;
      border: 1px solid #bfdbfe;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .kpi-val {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0 2px;
    }
    .kpi-sub {
      font-size: 9px;
      color: #94a3b8;
    }
    .section-card {
      margin-bottom: 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .section-title {
      background: #f1f5f9;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #ffffff;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border-bottom: 1.5px solid #cbd5e1;
    }
    td {
      padding: 6.5px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background: #fafafa;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="brand-col">
      <span class="badge">OFFICIAL VERIFIED AUDIT REPORT</span>
      <h1>${escapeHtml(data.reportTitle)}</h1>
      <p>${escapeHtml(data.reportSubtitle || "Campus Management System - Live Data Report")}</p>
    </div>
    <div class="meta-col">
      <div>Generated on: <strong>${escapeHtml(dateFormatted)} ${escapeHtml(timeFormatted)}</strong></div>
      <div>Authorized User: <strong>${escapeHtml(data.generatedBy || "Administrator")}</strong></div>
      <div>Platform: <strong>Campusly ERP</strong></div>
    </div>
  </div>

  <div class="kpi-grid">
    ${kpisHtml}
  </div>

  ${sectionsHtml}

  <div class="footer">
    <div>Generated by Campusly ERP. All live records synchronized with Firebase Firestore.</div>
    <div>Page 1 of 1 &bull; Confidential Administrative Record</div>
  </div>
</body>
</html>
  `;
}

/**
 * Export and Download PDF Report.
 * On Web: Triggers print/save as PDF dialog.
 * On Native: Saves to file and triggers system share/save modal.
 */
export async function downloadReportPdf(
  data: ReportDataPayload,
  filenamePrefix = "Campusly_Report"
): Promise<boolean> {
  try {
    const html = generateReportHtml(data);

    if (Platform.OS === "web") {
      await Print.printAsync({ html });
      return true;
    } else {
      const file = await Print.printToFileAsync({
        html,
        width: 595,
        height: 842,
      });

      const dateStr = new Date().toISOString().split("T")[0];
      const filename = `${filenamePrefix}_${dateStr}.pdf`;

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: `Download ${data.reportTitle}`,
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf",
        });
        return true;
      } else {
        Alert.alert("PDF Generated", `Saved PDF report to: ${file.uri}`);
        return true;
      }
    }
  } catch (err: any) {
    console.error("PDF export error:", err);
    Alert.alert("PDF Export Failed", err?.message || "Could not generate PDF report.");
    return false;
  }
}

/**
 * Converts ReportDataPayload into CSV formatted text.
 */
export function generateReportCsv(data: ReportDataPayload): string {
  const lines: string[] = [];

  // Title header
  lines.push(`"${data.reportTitle.replace(/"/g, '""')}"`);
  if (data.reportSubtitle) {
    lines.push(`"${data.reportSubtitle.replace(/"/g, '""')}"`);
  }
  lines.push(`"Generated Date:","${new Date().toLocaleString()}"`);
  lines.push(`"Generated By:","${data.generatedBy || "Administrator"}"`);
  lines.push("");

  // KPIs
  lines.push("--- KEY PERFORMANCE INDICATORS ---");
  lines.push('"Metric","Value","Details"');
  data.kpis.forEach((k) => {
    const label = `"${String(k.label).replace(/"/g, '""')}"`;
    const val = `"${String(k.value).replace(/"/g, '""')}"`;
    const sub = `"${String(k.subtext || "").replace(/"/g, '""')}"`;
    lines.push(`${label},${val},${sub}`);
  });
  lines.push("");

  // Sections
  data.sections.forEach((sec) => {
    lines.push(`--- ${sec.title.toUpperCase()} ---`);
    lines.push(sec.headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","));
    sec.rows.forEach((row) => {
      lines.push(row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","));
    });
    lines.push("");
  });

  return lines.join("\r\n");
}

/**
 * Export and Download CSV Report.
 * On Web: Direct browser file download via Blob and <a> tag.
 * On Native: Saves to FileSystem documentDirectory and triggers system share sheet.
 */
export async function downloadReportCsv(
  data: ReportDataPayload,
  filenamePrefix = "Campusly_Report"
): Promise<boolean> {
  try {
    const csvContent = generateReportCsv(data);
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${filenamePrefix}_${dateStr}.csv`;

    if (Platform.OS === "web") {
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } else {
      const targetPath = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(targetPath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetPath, {
          dialogTitle: `Download CSV Report`,
          mimeType: "text/csv",
          UTI: "public.comma-separated-values-text",
        });
        return true;
      } else {
        Alert.alert("CSV Saved", `Report downloaded to ${targetPath}`);
        return true;
      }
    }
  } catch (err: any) {
    console.error("CSV export error:", err);
    Alert.alert("CSV Export Failed", err?.message || "Could not generate CSV report.");
    return false;
  }
}
