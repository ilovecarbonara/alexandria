import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export interface CertificateData {
  authorName: string;
  title: string;
  thesisLevel: string;
  thesisCategory: string;
  submissionType: string;
  sha256Hash: string;
  txHash: string;
  blockTimestamp: string;
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

  function drawField(label: string, value: string, isHash = false) {
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(COLORS.muted);
    doc.text(label.toUpperCase(), labelX, y);

    y += lineHeight;
    doc.setFontSize(10);
    doc.setTextColor(isHash ? COLORS.hash : COLORS.text);

    // Wrap long text
    const lines = doc.splitTextToSize(value, CONTENT_WIDTH - 10);
    doc.text(lines, valueX, y);
    y += lines.length * 5 + 4;
  }

  drawField("Author", data.authorName);
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
