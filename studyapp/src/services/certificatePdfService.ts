import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Platform } from "react-native";
import { storage } from "../firebase/config";

export interface CertificateData {
  studentName: string;
  studentRollNo: string;
  department?: string;
  title: string;
  subject: string;
  grade: string;
  issuedBy: string;
  issuerTitle?: string;
  issueDate: string;
  credentialId: string;
  description?: string;
  photoUrl?: string;
}

/**
 * Generates an elegant, high-resolution HTML certificate template
 * formatted for A4 landscape print/PDF generation.
 */
export function generateCertificateHtml(data: CertificateData): string {
  const {
    studentName,
    studentRollNo,
    department = "Department of Academics",
    title,
    subject,
    grade,
    issuedBy,
    issuerTitle = "Faculty Mentor & Instructor",
    issueDate,
    credentialId,
    description,
    photoUrl,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} - ${studentName}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cert-frame {
      width: 100%;
      max-width: 1060px;
      height: 720px;
      background: #ffffff;
      border: 12px solid #1e1b4b;
      outline: 3px solid #d97706;
      outline-offset: -8px;
      padding: 16px;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    .cert-inner {
      height: 100%;
      border: 2px dashed #ca8a04;
      padding: 28px 40px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: radial-gradient(circle at center, #ffffff 60%, #fffbeb 100%);
      position: relative;
    }
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-25deg);
      font-size: 80px;
      font-weight: 900;
      color: rgba(217, 119, 6, 0.04);
      letter-spacing: 12px;
      pointer-events: none;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .cert-header {
      text-align: center;
      position: relative;
    }
    .univ-emblem {
      width: 48px;
      height: 48px;
      margin: 0 auto 6px;
      background: #1e1b4b;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #d97706;
      color: #fbbf24;
      font-size: 24px;
      font-weight: bold;
    }
    .univ-name {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 4px;
      color: #1e1b4b;
      text-transform: uppercase;
    }
    .univ-sub {
      font-size: 11px;
      letter-spacing: 2px;
      color: #b45309;
      font-weight: 700;
      margin-top: 2px;
      text-transform: uppercase;
    }
    .gold-divider {
      width: 140px;
      height: 3px;
      background: linear-gradient(90deg, transparent, #d97706, transparent);
      margin: 8px auto;
    }
    .cert-award-title {
      font-size: 13px;
      letter-spacing: 3px;
      color: #4338ca;
      font-weight: 700;
      text-transform: uppercase;
    }
    .recipient-intro {
      text-align: center;
      font-style: italic;
      font-size: 13px;
      color: #4b5563;
      margin-top: 10px;
    }
    .student-block {
      text-align: center;
      margin: 6px 0;
    }
    .student-name {
      font-size: 32px;
      font-weight: 800;
      color: #1e1b4b;
      letter-spacing: 1px;
      display: inline-block;
      padding: 0 20px 4px;
      border-bottom: 2px solid #ca8a04;
      font-family: 'Times New Roman', Georgia, serif;
    }
    .student-roll {
      font-size: 13px;
      color: #4b5563;
      font-weight: 600;
      margin-top: 4px;
    }
    .award-reason {
      text-align: center;
      font-size: 13.5px;
      color: #374151;
      max-width: 84%;
      margin: 6px auto;
      line-height: 1.5;
    }
    .cert-course-highlight {
      font-size: 18px;
      font-weight: 700;
      color: #b45309;
      margin-top: 4px;
    }
    .grade-container {
      text-align: center;
      margin: 8px 0;
    }
    .grade-badge {
      display: inline-block;
      background: #fef3c7;
      border: 1px solid #d97706;
      color: #92400e;
      padding: 4px 18px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 12px;
      border-top: 1px dashed #d1d5db;
    }
    .meta-box {
      font-size: 11px;
      color: #4b5563;
      line-height: 1.6;
    }
    .meta-id {
      font-family: monospace;
      font-weight: 700;
      color: #111827;
      background: #f3f4f6;
      padding: 1px 6px;
      border-radius: 4px;
    }
    .seal-box {
      text-align: center;
    }
    .official-seal {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 3px double #b45309;
      background: radial-gradient(circle, #fef3c7 40%, #fde68a 100%);
      color: #78350f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .signature-box {
      text-align: right;
    }
    .signature-font {
      font-family: 'Brush Script MT', 'cursive', 'Times New Roman', serif;
      font-size: 24px;
      color: #1e1b4b;
      margin-bottom: 2px;
    }
    .signature-line {
      width: 170px;
      border-top: 1.5px solid #4b5563;
      margin-left: auto;
      margin-bottom: 3px;
    }
    .signer-name {
      font-size: 12px;
      font-weight: 700;
      color: #1f2937;
    }
    .signer-title {
      font-size: 10px;
      color: #6b7280;
    }
    .photo-corner {
      position: absolute;
      top: 24px;
      right: 36px;
      width: 72px;
      height: 72px;
      border-radius: 8px;
      border: 2px solid #ca8a04;
      object-fit: cover;
      box-shadow: 0 3px 8px rgba(0,0,0,0.15);
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="cert-frame">
    <div class="cert-inner">
      <div class="watermark">CAMPUSLY VERIFIED</div>

      ${photoUrl ? `<img src="${photoUrl}" class="photo-corner" alt="Certificate Photo" />` : ""}

      <div class="cert-header">
        <div class="univ-emblem">🎓</div>
        <div class="univ-name">Campusly University</div>
        <div class="univ-sub">Official Academic Accreditation & Excellence Board</div>
        <div class="gold-divider"></div>
        <div class="cert-award-title">Official Certificate of Achievement</div>
      </div>

      <div class="recipient-intro">This accredited credential is conferred upon</div>

      <div class="student-block">
        <div class="student-name">${studentName}</div>
        <div class="student-roll">Roll No: ${studentRollNo} • ${department}</div>
      </div>

      <div class="award-reason">
        In formal recognition of distinguished academic achievement and outstanding competence in
        <div class="cert-course-highlight">${title} (${subject})</div>
        ${description ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${description}</div>` : ""}
      </div>

      <div class="grade-container">
        <div class="grade-badge">★ ${grade} ★</div>
      </div>

      <div class="cert-footer">
        <div class="meta-box">
          <div>Credential ID: <span class="meta-id">${credentialId}</span></div>
          <div>Issue Date: <strong>${issueDate}</strong></div>
          <div style="color: #059669; font-weight: 700; margin-top: 2px;">✓ Verified by Campusly Digital Registry</div>
        </div>

        <div class="seal-box">
          <div class="official-seal">
            <span>OFFICIAL</span>
            <span style="font-size: 13px; margin: 1px 0;">★</span>
            <span>ACCREDITED</span>
          </div>
        </div>

        <div class="signature-box">
          <div class="signature-font">${issuedBy}</div>
          <div class="signature-line"></div>
          <div class="signer-name">${issuedBy}</div>
          <div class="signer-title">${issuerTitle}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generates a PDF file from certificate data using expo-print.
 * Returns the local file URI.
 */
export async function generateCertificatePdf(data: CertificateData): Promise<{ uri: string; name: string }> {
  const html = generateCertificateHtml(data);
  const file = await Print.printToFileAsync({
    html,
    width: 842, // A4 landscape points (approx 842 x 595)
    height: 595,
  });

  const sanitizedRoll = data.studentRollNo.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Certificate_${sanitizedRoll}_${data.credentialId}.pdf`;

  return {
    uri: file.uri,
    name: fileName,
  };
}

/**
 * Picks a PDF document from device storage.
 */
export async function pickPdfDocument(): Promise<{
  uri: string;
  name: string;
  size?: number;
} | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name || "certificate.pdf",
    size: asset.size,
  };
}

/**
 * Converts any local file URI or web URI to a Blob
 * for uploading to Firebase Storage.
 */
export async function uriToBlob(uri: string): Promise<Blob> {
  // If it's already a web blob URL or data URL
  try {
    const response = await fetch(uri);
    return await response.blob();
  } catch {
    // Fallback XMLHttpRequest for Android file:/// URIs
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.response) {
          resolve(xhr.response);
        } else {
          reject(new Error("Empty data received while reading file."));
        }
      };
      xhr.onerror = () => reject(new Error("Failed to read file as blob."));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });
  }
}

/**
 * Uploads a local certificate photo or PDF file to Firebase Storage.
 * Returns public download URL. If upload fails, falls back gracefully.
 */
export async function uploadCertificateFile(
  uri: string,
  type: "photo" | "pdf",
  credentialId: string
): Promise<string> {
  // If already an HTTP / HTTPS URL, no need to upload
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  try {
    const blob = await uriToBlob(uri);
    const timestamp = Date.now();
    const extension = type === "photo" ? "jpg" : "pdf";
    const contentType = type === "photo" ? "image/jpeg" : "application/pdf";
    const path = `certificates/${type}s/${credentialId}_${timestamp}.${extension}`;

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error: any) {
    console.warn(`Certificate ${type} storage upload failed:`, error?.message);
    // Return original URI as fallback
    return uri;
  }
}

/**
 * Shares or downloads a PDF file on Mobile or Web.
 */
export async function shareOrDownloadPdf(pdfUrl: string, title?: string): Promise<boolean> {
  if (!pdfUrl) return false;

  try {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        try {
          const a = document.createElement("a");
          a.href = pdfUrl;
          a.download = title
            ? `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`
            : "Certificate.pdf";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          return true;
        } catch {
          window.open(pdfUrl, "_blank");
          return true;
        }
      }
    }

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(pdfUrl, {
        dialogTitle: title || "Official Certificate PDF",
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
      return true;
    }
  } catch (e: any) {
    console.warn("Share/download error:", e?.message);
  }

  return false;
}

/**
 * Uploads a local request hardcopy (photo or PDF) to Firebase Storage.
 * Supports both student submissions and admin responses.
 */
export async function uploadRequestFile(
  uri: string,
  type: "photo" | "pdf",
  requestId: string,
  sender: "student" | "admin" = "student"
): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  try {
    const blob = await uriToBlob(uri);
    const timestamp = Date.now();
    const extension = type === "photo" ? "jpg" : "pdf";
    const contentType = type === "photo" ? "image/jpeg" : "application/pdf";
    const path = `requests/${sender}_${type}s/${requestId}_${timestamp}.${extension}`;

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.warn(`Request ${type} storage upload failed:`, error?.message);
    return uri;
  }
}

/**
 * Uploads a local special note photo or PDF file to Firebase Storage.
 */
export async function uploadSpecialNoteFile(
  uri: string,
  type: "photo" | "pdf",
  noteId: string
): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  try {
    const blob = await uriToBlob(uri);
    const timestamp = Date.now();
    const extension = type === "photo" ? "jpg" : "pdf";
    const contentType = type === "photo" ? "image/jpeg" : "application/pdf";
    const path = `specialNotes/${type}s/${noteId}_${timestamp}.${extension}`;

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.warn(`SpecialNote ${type} storage upload failed:`, error?.message);
    return uri;
  }
}

/**
 * Uploads a local chat message photo or PDF file to Firebase Storage.
 */
export async function uploadChatMessageFile(
  uri: string,
  type: "photo" | "pdf",
  chatId: string
): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  try {
    const blob = await uriToBlob(uri);
    const timestamp = Date.now();
    const extension = type === "photo" ? "jpg" : "pdf";
    const contentType = type === "photo" ? "image/jpeg" : "application/pdf";
    const path = `chatMessages/${type}s/${chatId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${timestamp}.${extension}`;

    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.warn(`ChatMessage ${type} storage upload failed:`, error?.message);
    return uri;
  }
}

