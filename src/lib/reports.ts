import jsPDF from "jspdf";
import type { DetectionAnalysis } from "./detection-types";

export interface ReportData {
  filename: string;
  mediaType: string;
  createdAt: string;
  analysis: DetectionAnalysis;
  model?: string;
  processingMs?: number;
}

export function buildJson(r: ReportData) {
  return JSON.stringify(r, null, 2);
}

export function buildCsv(r: ReportData) {
  const rows: [string, string | number][] = [
    ["Filename", r.filename],
    ["Media Type", r.mediaType],
    ["Analyzed At", r.createdAt],
    ["Prediction", r.analysis.prediction],
    ["Risk Level", r.analysis.risk_level],
    ["Authenticity Score (%)", r.analysis.authenticity_score],
    ["Manipulation Score (%)", r.analysis.manipulation_score],
    ["Confidence Score (%)", r.analysis.confidence_score],
    ["Model", r.model ?? ""],
    ["Processing (ms)", r.processingMs ?? ""],
    ["Explanation", r.analysis.explanation.replace(/\n/g, " ")],
  ];
  const head = "Field,Value\n";
  const body = rows.map(([k, v]) => `"${k}","${String(v).replace(/"/g, '""')}"`).join("\n");
  const findings = "\n\nFindings\nCategory,Detail,Severity\n" +
    r.analysis.findings.map(f => `"${f.category}","${f.detail.replace(/"/g,'""')}","${f.severity}"`).join("\n");
  return head + body + findings;
}

export function buildPdf(r: ReportData): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  let y = 56;

  doc.setFillColor(15, 20, 35); doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(0, 229, 255); doc.setFont("helvetica","bold"); doc.setFontSize(22);
  doc.text("DeepGuard AI — Verification Report", 40, 50);
  doc.setTextColor(170, 180, 200); doc.setFontSize(10);
  doc.text(`Generated ${new Date().toLocaleString()}`, 40, 70);

  y = 120;
  doc.setTextColor(20, 20, 30); doc.setFontSize(12); doc.setFont("helvetica","bold");
  doc.text("Media", 40, y); y += 18;
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  doc.text(`File: ${r.filename}`, 40, y); y += 14;
  doc.text(`Type: ${r.mediaType}`, 40, y); y += 14;
  doc.text(`Analyzed: ${new Date(r.createdAt).toLocaleString()}`, 40, y); y += 14;
  if (r.model) { doc.text(`Model: ${r.model}`, 40, y); y += 14; }

  y += 16;
  doc.setFont("helvetica","bold"); doc.setFontSize(14);
  doc.text("Verdict", 40, y); y += 22;
  doc.setFontSize(24);
  const verdictColor: [number,number,number] = r.analysis.prediction === "Fake" ? [239,68,68]
    : r.analysis.prediction === "Suspicious" ? [245,158,11] : [34,197,94];
  doc.setTextColor(...verdictColor);
  doc.text(`${r.analysis.prediction} • ${r.analysis.risk_level} Risk`, 40, y); y += 26;

  doc.setTextColor(20,20,30); doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Scores", 40, y); y += 18;
  doc.setFont("helvetica","normal"); doc.setFontSize(11);
  doc.text(`Authenticity: ${r.analysis.authenticity_score.toFixed(1)}%`, 40, y); y += 14;
  doc.text(`Manipulation: ${r.analysis.manipulation_score.toFixed(1)}%`, 40, y); y += 14;
  doc.text(`Confidence: ${r.analysis.confidence_score.toFixed(1)}%`, 40, y); y += 22;

  doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("AI Explanation", 40, y); y += 16;
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  const lines = doc.splitTextToSize(r.analysis.explanation, W - 80);
  doc.text(lines, 40, y); y += lines.length * 13 + 12;

  doc.setFont("helvetica","bold"); doc.setFontSize(12);
  doc.text("Findings", 40, y); y += 16;
  doc.setFont("helvetica","normal"); doc.setFontSize(10);
  r.analysis.findings.forEach(f => {
    if (y > 780) { doc.addPage(); y = 60; }
    const text = `• [${f.severity.toUpperCase()}] ${f.category}: ${f.detail}`;
    const wrapped = doc.splitTextToSize(text, W - 80);
    doc.text(wrapped, 40, y);
    y += wrapped.length * 13 + 4;
  });

  return doc.output("blob");
}

export function downloadBlob(content: string | Blob, filename: string, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
