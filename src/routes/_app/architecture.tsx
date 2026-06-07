import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Layers, Database, Cpu, Image as ImageIcon, Video, AudioLines, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_app/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture · DeepGuard AI" },
      { name: "description", content: "System architecture, modules and data flow for the DeepGuard AI deepfake detection platform." },
    ],
  }),
  component: ArchitecturePage,
});

const MODULES = [
  { name: "Requirement Analysis & System Architecture", note: "Documented on this page; modular client/server split." },
  { name: "Dataset Collection & Media Preprocessing", note: "Client-side resize, frame sampling and base64 packaging before upload." },
  { name: "Deep Learning Model for Fake Detection", note: "Hosted multimodal Gemini 2.5 Pro/Flash via Lovable AI Gateway with strict forensic prompt + reviewer pass." },
  { name: "Image, Video & Audio Analysis", note: "Dedicated server functions per modality, each returning a typed verdict." },
  { name: "Real-Time Detection & Verification Engine", note: "Webcam capture, live mic recording, streaming progress, instant re-verify." },
  { name: "Web Application & Backend Integration", note: "TanStack Start app + Lovable Cloud (auth, RLS, storage, Postgres)." },
  { name: "Testing, Deployment & Performance Optimization", note: "Image downscaling, conditional reviewer pass, 45 s gateway timeout, edge deployment." },
];

const PIPELINES = [
  { icon: ImageIcon, label: "Image", steps: ["Load file / webcam", "Downscale ≤1280 px JPEG", "Send to Gemini 2.5 Flash", "Conditional reviewer pass", "Normalize + persist"] },
  { icon: Video, label: "Video", steps: ["Load file", "Sample 6 evenly-spaced frames", "Send frame sequence to Gemini 2.5 Pro", "Temporal consistency check", "Normalize + persist"] },
  { icon: AudioLines, label: "Audio", steps: ["Load file / record mic", "Base64 encode", "Send to Gemini 2.5 Flash", "Prosody / cadence checks", "Normalize + persist"] },
];

const TABLES = [
  { name: "media_files", note: "Uploaded media metadata (filename, mime, size, storage path). RLS: owner-only." },
  { name: "detection_results", note: "Verdict, scores, risk, findings JSON, model, processing ms. RLS: owner-only." },
  { name: "reports", note: "Generated report records linked to a detection. RLS: owner-only." },
  { name: "profiles / user_roles", note: "Profile + role-based access (admin via has_role security-definer function)." },
  { name: "audit_logs / notifications", note: "Operational tables for admin review and user notices." },
];

export default function ArchitecturePage() { return <ArchitecturePageInner />; }

function ArchitecturePageInner() {
  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold">System architecture</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modules, data flow and integration points for the DeepGuard AI verification platform.
        </p>
      </header>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3"><Layers className="h-4 w-4 text-primary" /><h2 className="font-semibold">High-level flow</h2></div>
        <pre className="text-xs leading-6 overflow-x-auto bg-muted/40 p-4 rounded-lg">{
`  ┌────────────┐    upload / capture    ┌──────────────┐    auth + RLS    ┌──────────────┐
  │  Browser   │ ─────────────────────▶ │ TanStack     │ ───────────────▶ │ Lovable      │
  │  (client)  │  preprocess (resize,   │ Server Fn    │                  │ Cloud        │
  │            │  frame sample, b64)    │ (edge)       │                  │ (Postgres +  │
  └─────┬──────┘                        └──────┬───────┘                  │  Storage +   │
        │                                      │                          │  Auth)       │
        │ live progress + verdict              │ Lovable AI Gateway       └──────────────┘
        ▼                                      ▼
  ┌────────────┐                        ┌──────────────┐
  │ Report UI  │ ◀── verdict + scores ──│  Gemini 2.5  │
  │ PDF/CSV/JSON│                       │  Pro / Flash │
  └────────────┘                        └──────────────┘`}
        </pre>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3"><CheckCircle2 className="h-4 w-4 text-success" /><h2 className="font-semibold">Module status</h2></div>
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr><th className="p-3 w-10">#</th><th className="p-3">Module</th><th className="p-3">Status</th></tr>
            </thead>
            <tbody>
              {MODULES.map((m, i) => (
                <tr key={m.name} className="border-t border-border/40">
                  <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-3">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.note}</div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 text-success px-2 py-0.5 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Complete
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3"><Cpu className="h-4 w-4 text-primary" /><h2 className="font-semibold">Per-modality pipeline</h2></div>
        <div className="grid gap-4 md:grid-cols-3">
          {PIPELINES.map(({ icon: Icon, label, steps }) => (
            <div key={label} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3"><Icon className="h-4 w-4 text-primary" /><h3 className="font-semibold">{label}</h3></div>
              <ol className="space-y-1.5 text-sm">
                {steps.map((s, i) => (
                  <li key={s} className="flex gap-2">
                    <span className="font-mono text-xs text-muted-foreground w-5">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3"><Database className="h-4 w-4 text-primary" /><h2 className="font-semibold">Data model</h2></div>
        <div className="glass rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr><th className="p-3">Table</th><th className="p-3">Purpose & access</th></tr>
            </thead>
            <tbody>
              {TABLES.map((t) => (
                <tr key={t.name} className="border-t border-border/40">
                  <td className="p-3 font-mono">{t.name}</td>
                  <td className="p-3 text-muted-foreground">{t.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-2"><ShieldCheck className="h-4 w-4 text-success" /><h2 className="font-semibold">Security & performance</h2></div>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
          <li>Row-Level Security on every user-facing table; admin access gated by a SECURITY DEFINER <code>has_role()</code> function.</li>
          <li>Private storage bucket for uploaded media; signed URLs only.</li>
          <li>Image payloads compressed client-side (~10× smaller) to stay under the AI gateway 45 s timeout.</li>
          <li>Reviewer (second-pass) AI call runs only when the first verdict is low-confidence Authentic — keeps the common case fast.</li>
          <li>Strict forensic system prompt + conservative score normalization prevent false "Authentic" verdicts on AI-generated media.</li>
        </ul>
      </section>
    </div>
  );
}
