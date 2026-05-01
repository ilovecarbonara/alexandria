import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface VersionHistoryEntry {
  submissionType: string;
  sha256Hash: string;
  txHash: string;
  blockTimestamp: string;
}

export interface CertificateData {
  authorNames: string[];
  title: string;
  thesisLevel: string;
  thesisCategory: string;
  submissionType: string;
  sha256Hash: string;
  txHash: string;
  blockTimestamp: string;
  versionHistory?: VersionHistoryEntry[];
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLORS = {
  dark: "#0D0F12",
  surface: "#13161C",
  border: "#222733",
  accent: "#4A90D9",
  hash: "#5CC8FF",
  text: "#ededed",
  muted: "#8a8f9d",
} as const;

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function generateCertificate(data: CertificateData): Promise<jsPDF> {
  const etherscanUrl = `https://sepolia.etherscan.io/tx/${data.txHash}`;

  const qrDataUrl = await QRCode.toDataURL(etherscanUrl, {
    errorCorrectionLevel: "H",
    type: "image/png",
    margin: 1,
    width: 200,
    color: {
      dark: "#000000ff",
      light: "#ffffffff",
    },
  });

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setDocumentProperties({
    title: `Alexandria Registration Record — ${data.title}`,
    subject: "Thesis Registration Record",
    author: "Project Alexandria",
    creator: "Project Alexandria",
  });

  // --- Background ---
  doc.setFillColor(COLORS.dark);
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

  // --- Outer border ---
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN - 5, MARGIN - 5, CONTENT_WIDTH + 10, PAGE_HEIGHT - MARGIN * 2 + 10);

  // --- Inner border ---
  doc.setDrawColor(COLORS.accent);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN - 2, MARGIN - 2, CONTENT_WIDTH + 4, PAGE_HEIGHT - MARGIN * 2 + 4);

  let y = MARGIN + 10;

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(COLORS.text);
  doc.text("ALEXANDRIA", PAGE_WIDTH / 2, y, { align: "center" });

  y += 8;
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(COLORS.muted);
  doc.text("BLOCKCHAIN THESIS REGISTRY", PAGE_WIDTH / 2, y, { align: "center" });

  // --- Divider ---
  y += 6;
  doc.setDrawColor(COLORS.accent);
  doc.setLineWidth(0.4);
  doc.line(MARGIN + 20, y, PAGE_WIDTH - MARGIN - 20, y);

  // --- "Registration Record" label ---
  y += 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(COLORS.accent);
  doc.text("REGISTRATION RECORD", PAGE_WIDTH / 2, y, { align: "center" });

  // --- Registered at timestamp ---
  y += 8;
  doc.setFont("courier", "normal");
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted);
  doc.text(formatTimestamp(data.blockTimestamp), PAGE_WIDTH / 2, y, { align: "center" });

  // --- Details section ---
  y += 14;

  const labelX = MARGIN + 5;
  const valueX = MARGIN + 5;
  const lineHeight = 6;

  function drawField(label: string, value: string | string[], isHash = false) {
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text(label.toUpperCase(), labelX, y);

    y += lineHeight;
    doc.setFontSize(10);
    doc.setTextColor(isHash ? COLORS.hash : COLORS.text);

    const values = Array.isArray(value) ? value : [value];
    const lines = values.flatMap((line) =>
      doc.splitTextToSize(line, CONTENT_WIDTH - 10),
    );
    doc.text(lines, valueX, y);
    y += lines.length * 5 + 4;
  }

  drawField("Authors", data.authorNames);
  drawField("Title", data.title);
  drawField("Level", capitalize(data.thesisLevel));
  drawField("Category", data.thesisCategory);
  drawField("Submission Type", capitalize(data.submissionType));

  // --- Divider before hashes ---
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 5, y, PAGE_WIDTH - MARGIN - 5, y);
  y += 8;

  drawField("SHA-256 Document Hash", data.sha256Hash, true);
  drawField("Transaction Hash", data.txHash, true);

  // --- QR Code ---
  const qrSize = 35;
  const qrX = PAGE_WIDTH / 2 - qrSize / 2;
  y += 2;
  doc.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);

  y += qrSize + 4;
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted);
  doc.text("Scan to verify on Sepolia Etherscan", PAGE_WIDTH / 2, y, {
    align: "center",
  });

  // --- Version History Table (only for chains with multiple entries) ---
  if (data.versionHistory && data.versionHistory.length > 1) {
    y += 10;
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.2);
    doc.line(MARGIN + 5, y, PAGE_WIDTH - MARGIN - 5, y);

    y += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COLORS.accent);
    doc.text("VERSION HISTORY", PAGE_WIDTH / 2, y, { align: "center" });

    y += 6;

    // Table layout
    const tableX = MARGIN + 5;
    const colWidths = [10, 18, 50, 50, CONTENT_WIDTH - 10 - 10 - 18 - 50 - 50];
    const headers = ["#", "Type", "SHA-256", "Tx Hash", "Date"];
    const rowHeight = 6;

    // Header row
    doc.setFillColor(COLORS.surface);
    doc.rect(tableX, y, CONTENT_WIDTH - 10, rowHeight, "F");
    doc.setDrawColor(COLORS.border);
    doc.rect(tableX, y, CONTENT_WIDTH - 10, rowHeight, "S");

    doc.setFont("courier", "bold");
    doc.setFontSize(7);
    doc.setTextColor(COLORS.muted);

    let colX = tableX;
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i], colX + 2, y + 4);
      colX += colWidths[i];
    }

    y += rowHeight;

    // Data rows
    doc.setFont("courier", "normal");
    doc.setFontSize(7);

    for (let i = 0; i < data.versionHistory.length; i++) {
      const entry = data.versionHistory[i];
      const rowY = y;

      // Alternating row background
      if (i % 2 === 0) {
        doc.setFillColor("#0F1117");
        doc.rect(tableX, rowY, CONTENT_WIDTH - 10, rowHeight, "F");
      }

      doc.setDrawColor(COLORS.border);
      doc.rect(tableX, rowY, CONTENT_WIDTH - 10, rowHeight, "S");

      colX = tableX;

      // Version number
      doc.setTextColor(COLORS.muted);
      doc.text(`v${i + 1}`, colX + 2, rowY + 4);
      colX += colWidths[0];

      // Submission type
      doc.setTextColor(COLORS.text);
      doc.text(capitalize(entry.submissionType), colX + 2, rowY + 4);
      colX += colWidths[1];

      // SHA-256 (truncated)
      doc.setTextColor(COLORS.hash);
      doc.text(entry.sha256Hash.slice(0, 16) + "…", colX + 2, rowY + 4);
      colX += colWidths[2];

      // Tx Hash (truncated)
      doc.text(entry.txHash.slice(0, 16) + "…", colX + 2, rowY + 4);
      colX += colWidths[3];

      // Date
      doc.setTextColor(COLORS.muted);
      const dateStr = new Date(entry.blockTimestamp).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      doc.text(dateStr, colX + 2, rowY + 4);

      y += rowHeight;
    }

    y += 2;
  }

  // --- Disclaimer ---
  y += 10;
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(MARGIN + 10, y, PAGE_WIDTH - MARGIN - 10, y);

  y += 6;
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.muted);

  const disclaimer =
    "This document certifies that the above thesis was registered on the Sepolia " +
    "blockchain via Project Alexandria. This is a REGISTRATION RECORD only — it does " +
    "not constitute proof of authorship, originality, or academic approval. The " +
    "blockchain entry is immutable and publicly verifiable.";

  const disclaimerLines = doc.splitTextToSize(disclaimer, CONTENT_WIDTH - 20);
  doc.text(disclaimerLines, PAGE_WIDTH / 2, y, { align: "center" });

  // --- Footer ---
  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.setTextColor(COLORS.border);
  doc.text(
    "Project Alexandria — USPF Blockchain Thesis Registry",
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - MARGIN + 2,
    { align: "center" },
  );

  return doc;
}
