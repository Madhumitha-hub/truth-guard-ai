import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, Video, AudioLines, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { buildJson, buildCsv, buildPdf, downloadBlob, type ReportData } from "@/lib/reports";
import type { DetectionAnalysis } from "@/lib/detection-types";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports · DeepGuard AI" }] }),
  component: ReportsPage,
});

interface Row {
  id: string;
  prediction: DetectionAnalysis["prediction"];
  risk_level: DetectionAnalysis["risk_level"];
  authenticity_score: number;
  manipulation_score: number;
  confidence_score: number;
  explanation: string | null;
  findings: DetectionAnalysis["findings"] | null;
  model_used: string | null;
  processing_time_ms: number | null;
  created_at: string;
  media_files: { filename: string; media_type: string } | null;
}

function ReportsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["reports-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detection_results")
        .select("id, prediction, risk_level, authenticity_score, manipulation_score, confidence_score, explanation, findings, model_used, processing_time_ms, created_at, media_files(filename, media_type)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const [highlight, setHighlight] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.location.hash.replace("#", "");
    if (id) {
      setHighlight(id);
      requestAnimationFrame(() => {
        document.getElementById(`report-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [data]);

  const download = (row: Row, fmt: "pdf" | "csv" | "json") => {
    if (!row.media_files) return;
    const analysis: DetectionAnalysis = {
      prediction: row.prediction,
      risk_level: row.risk_level,
      authenticity_score: Number(row.authenticity_score),
      manipulation_score: Number(row.manipulation_score),
      confidence_score: Number(row.confidence_score),
      explanation: row.explanation ?? "",
      findings: row.findings ?? [],
    };
    const report: ReportData = {
      filename: row.media_files.filename,
      mediaType: row.media_files.media_type,
      createdAt: row.created_at,
      analysis,
      model: row.model_used ?? undefined,
      processingMs: row.processing_time_ms ?? undefined,
    };
    const base = row.media_files.filename.replace(/\.[^.]+$/, "");
    if (fmt === "json") downloadBlob(buildJson(report), `${base}-report.json`, "application/json");
    else if (fmt === "csv") downloadBlob(buildCsv(report), `${base}-report.csv`, "text/csv");
    else downloadBlob(buildPdf(report), `${base}-report.pdf`, "application/pdf");
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Download forensic reports for every verification — PDF, CSV or JSON. Reports are generated from stored results, no AI re-run required.</p>
        </div>
        <FileText className="h-7 w-7 text-primary shrink-0" />
      </div>

      {isLoading && <div className="glass rounded-2xl p-8 text-center text-muted-foreground">Loading reports…</div>}

      {!isLoading && (data ?? []).length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <h3 className="text-lg font-semibold">No reports yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Run your first verification from <Link to="/detect/$type" params={{ type: "image" }} className="text-primary hover:underline">Image Detection</Link> to generate a report.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {(data ?? []).map((row) => {
          const mf = row.media_files;
          const Icon = mf?.media_type === "video" ? Video : mf?.media_type === "audio" ? AudioLines : ImageIcon;
          const VerdictIcon = row.prediction === "Authentic" ? ShieldCheck : row.prediction === "Fake" ? ShieldX : ShieldAlert;
          const verdictCls = row.prediction === "Authentic" ? "text-success" : row.prediction === "Fake" ? "text-destructive" : "text-warning";
          const isHi = highlight === row.id;
          return (
            <div
              key={row.id}
              id={`report-${row.id}`}
              className={`glass rounded-2xl p-5 transition ${isHi ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Icon className="h-4 w-4" /> {mf?.media_type ?? "—"}
                    <span>·</span>
                    <span>{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 font-medium truncate">{mf?.filename ?? "—"}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className={`inline-flex items-center gap-1 font-semibold ${verdictCls}`}>
                      <VerdictIcon className="h-3.5 w-3.5" /> {row.prediction}
                    </span>
                    <span className="text-muted-foreground">Risk: <span className="text-foreground">{row.risk_level}</span></span>
                    <span className="text-muted-foreground">Manipulation: <span className="font-mono text-foreground">{Number(row.manipulation_score).toFixed(1)}%</span></span>
                    <span className="text-muted-foreground">Confidence: <span className="font-mono text-foreground">{Number(row.confidence_score).toFixed(1)}%</span></span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => download(row, "pdf")}><Download className="mr-1.5 h-3.5 w-3.5" /> PDF</Button>
                  <Button size="sm" variant="outline" onClick={() => download(row, "csv")}><Download className="mr-1.5 h-3.5 w-3.5" /> CSV</Button>
                  <Button size="sm" variant="outline" onClick={() => download(row, "json")}><Download className="mr-1.5 h-3.5 w-3.5" /> JSON</Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
