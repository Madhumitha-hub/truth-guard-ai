import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Loader2, ShieldCheck, ShieldAlert, ShieldX, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { analyzeImage, analyzeVideo, analyzeAudio } from "@/lib/detection.functions";
import { fileToBase64, extractVideoFrames, compressImageForAnalysis } from "@/lib/media-utils";
import { IMAGE_MIME, VIDEO_MIME, AUDIO_MIME, MAX_BYTES, type MediaType, type DetectionAnalysis } from "@/lib/detection-types";
import { buildJson, buildCsv, buildPdf, downloadBlob } from "@/lib/reports";

export const Route = createFileRoute("/_app/detect/$type")({
  head: ({ params }) => ({ meta: [{ title: `${params.type[0].toUpperCase()+params.type.slice(1)} Detection · DeepGuard AI` }] }),
  component: DetectPage,
});

const CONFIG: Record<MediaType, { accept: string; mimes: readonly string[]; label: string; stages: string[] }> = {
  image: { accept: "image/*", mimes: IMAGE_MIME, label: "Image", stages: ["Uploading", "Validating", "Detecting faces", "Running AI", "Scoring"] },
  video: { accept: "video/*", mimes: VIDEO_MIME, label: "Video", stages: ["Uploading", "Extracting frames", "Tracking faces", "Running AI", "Scoring"] },
  audio: { accept: "audio/*", mimes: AUDIO_MIME, label: "Audio", stages: ["Uploading", "Validating", "Extracting features", "Running AI", "Scoring"] },
};

function DetectPage() {
  const { type } = Route.useParams();
  const mediaType = type as MediaType;
  if (!["image", "video", "audio"].includes(mediaType)) {
    return <div className="p-8">Unknown type</div>;
  }
  const cfg = CONFIG[mediaType];
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DetectionAnalysis | null>(null);
  const [meta, setMeta] = useState<{ model?: string; processingMs?: number; createdAt?: string } | null>(null);

  const fnImage = useServerFn(analyzeImage);
  const fnVideo = useServerFn(analyzeVideo);
  const fnAudio = useServerFn(analyzeAudio);

  const onPick = (f: File | null) => {
    setResult(null); setStage(0);
    if (!f) { setFile(null); setPreviewUrl(null); return; }
    if (f.size > MAX_BYTES[mediaType]) {
      toast.error(`File exceeds ${MAX_BYTES[mediaType] / 1024 / 1024} MB`);
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const onRun = async () => {
    if (!file || !user) return;
    setRunning(true); setStage(1);
    try {
      // 1 upload to storage
      const path = `${user.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: media, error: mErr } = await supabase.from("media_files").insert({
        user_id: user.id, filename: file.name, media_type: mediaType,
        mime_type: file.type, file_size: file.size, storage_path: path,
      }).select().single();
      if (mErr) throw mErr;

      setStage(2);

      // 2 prepare payload + run inference
      let analysis: DetectionAnalysis;
      let processingMs: number;
      let model: string;

      if (mediaType === "image") {
        const { base64, mimeType } = await compressImageForAnalysis(file);
        setStage(3);
        const r = await fnImage({ data: { imageBase64: base64, mimeType, filename: file.name } });
        analysis = r.analysis; processingMs = r.processingMs; model = r.model;
      } else if (mediaType === "video") {
        const frames = await extractVideoFrames(file, 6);
        setStage(3);
        const r = await fnVideo({ data: { framesBase64: frames, filename: file.name } });
        analysis = r.analysis; processingMs = r.processingMs; model = r.model;
      } else {
        const b64 = await fileToBase64(file);
        setStage(3);
        const r = await fnAudio({ data: { audioBase64: b64, mimeType: file.type, filename: file.name } });
        analysis = r.analysis; processingMs = r.processingMs; model = r.model;
      }


      setStage(4);

      const { error: dErr } = await supabase.from("detection_results").insert({
        media_id: media.id, user_id: user.id,
        prediction: analysis.prediction,
        authenticity_score: analysis.authenticity_score,
        manipulation_score: analysis.manipulation_score,
        confidence_score: analysis.confidence_score,
        risk_level: analysis.risk_level,
        explanation: analysis.explanation,
        findings: analysis.findings,
        model_used: model,
        processing_time_ms: processingMs,
      });
      if (dErr) throw dErr;

      setStage(5);
      setResult(analysis);
      setMeta({ model, processingMs, createdAt: new Date().toISOString() });
      toast.success("Analysis complete");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  const downloadReport = (fmt: "pdf" | "csv" | "json") => {
    if (!result || !file || !meta) return;
    const data = { filename: file.name, mediaType, createdAt: meta.createdAt!, analysis: result, model: meta.model, processingMs: meta.processingMs };
    const base = file.name.replace(/\.[^.]+$/, "");
    if (fmt === "json") downloadBlob(buildJson(data), `${base}-report.json`, "application/json");
    else if (fmt === "csv") downloadBlob(buildCsv(data), `${base}-report.csv`, "text/csv");
    else downloadBlob(buildPdf(data), `${base}-report.pdf`, "application/pdf");
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{cfg.label} Deepfake Detection</h1>
        <p className="text-sm text-muted-foreground">Upload a {cfg.label.toLowerCase()} (max {MAX_BYTES[mediaType] / 1024 / 1024} MB). DeepGuard runs real AI inference and returns a forensic verdict.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upload */}
        <div className="glass rounded-2xl p-6">
          <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/70 bg-card/30 p-8 text-center cursor-pointer hover:border-primary/60 transition">
            <Upload className="h-8 w-8 text-primary" />
            <div className="font-medium">Drop {cfg.label.toLowerCase()} here or click to browse</div>
            <div className="text-xs text-muted-foreground">{cfg.mimes.join(" · ")}</div>
            <input type="file" accept={cfg.accept} className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
          </label>

          {file && previewUrl && (
            <div className="mt-5 space-y-3">
              <div className="text-xs text-muted-foreground">{file.name} · {(file.size/1024/1024).toFixed(2)} MB</div>
              {mediaType === "image" && <img src={previewUrl} alt="" className="max-h-64 rounded-lg mx-auto" />}
              {mediaType === "video" && <video src={previewUrl} controls className="max-h-64 rounded-lg w-full" />}
              {mediaType === "audio" && <audio src={previewUrl} controls className="w-full" />}
              <Button onClick={onRun} disabled={running} className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground">
                {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing…</> : "Run AI verification"}
              </Button>
            </div>
          )}

          {running && (
            <div className="mt-5 space-y-2">
              <Progress value={(stage / cfg.stages.length) * 100} />
              <div className="text-xs text-muted-foreground">{cfg.stages[Math.max(0, stage - 1)]}…</div>
            </div>
          )}
        </div>

        {/* Result */}
        <div className="glass rounded-2xl p-6">
          {!result ? (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              Results will appear here after analysis.
            </div>
          ) : (
            <div className="space-y-5">
              {(() => {
                const m = result.manipulation_score;
                const aiBand = m < 30 ? "no" : m <= 65 ? "maybe" : "yes";
                const badge =
                  aiBand === "no"
                    ? { text: "Likely Authentic", cls: "bg-success/15 text-success border-success/30" }
                    : aiBand === "maybe"
                    ? { text: "Possibly AI-Generated", cls: "bg-warning/15 text-warning border-warning/30" }
                    : { text: "Likely AI-Generated / Deepfake", cls: "bg-destructive/15 text-destructive border-destructive/30" };
                const noun = mediaType === "image" ? "image" : mediaType === "video" ? "video" : "audio clip";
                const summary =
                  aiBand === "no"
                    ? `This ${noun} is likely authentic — no strong signs of AI generation detected. AI verification is probabilistic, not absolute.`
                    : aiBand === "maybe"
                    ? `This ${noun} shows possible signs of AI generation or manipulation — review carefully before trusting it.`
                    : `This ${noun} is likely AI-generated or a deepfake.`;
                return (
                  <div className="flex items-start gap-3">
                    {result.prediction === "Authentic" && <ShieldCheck className="h-8 w-8 text-success shrink-0" />}
                    {result.prediction === "Suspicious" && <ShieldAlert className="h-8 w-8 text-warning shrink-0" />}
                    {result.prediction === "Fake" && <ShieldX className="h-8 w-8 text-destructive shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-2xl font-bold">{result.prediction}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                          {badge.text}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">Risk: {result.risk_level}</div>
                      <p className="text-sm mt-2">{summary}</p>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3">
                <ScoreBar label="Authenticity" value={result.authenticity_score} tone="success" />
                <ScoreBar label="Manipulation" value={result.manipulation_score} tone="destructive" />
                <ScoreBar label="Confidence" value={result.confidence_score} tone="primary" />
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-1">AI explanation</h4>
                <p className="text-sm text-muted-foreground">{result.explanation}</p>
              </div>

              {result.findings.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Findings</h4>
                  <ul className="space-y-1.5">
                    {result.findings.map((f, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <span className={`px-1.5 py-0.5 rounded font-mono ${
                          f.severity === "high" ? "bg-destructive/20 text-destructive" :
                          f.severity === "medium" ? "bg-warning/20 text-warning" : "bg-muted text-muted-foreground"
                        }`}>{f.severity}</span>
                        <span><strong>{f.category}:</strong> {f.detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => downloadReport("pdf")}><Download className="mr-1.5 h-3.5 w-3.5" /> PDF</Button>
                <Button size="sm" variant="outline" onClick={() => downloadReport("csv")}><Download className="mr-1.5 h-3.5 w-3.5" /> CSV</Button>
                <Button size="sm" variant="outline" onClick={() => downloadReport("json")}><Download className="mr-1.5 h-3.5 w-3.5" /> JSON</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, tone }: { label: string; value: number; tone: "success" | "destructive" | "primary" }) {
  const color = { success: "bg-success", destructive: "bg-destructive", primary: "bg-primary" }[tone];
  return (
    <div>
      <div className="flex justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className="font-mono">{value.toFixed(1)}%</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
