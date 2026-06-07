## Module audit

| # | Module | Status | Evidence |
|---|---|---|---|
| 1 | Requirement Analysis & System Architecture Design | Partial | `.lovable/plan.md` exists but there is no user-facing architecture/requirements doc shipped with the app. |
| 2 | Dataset Collection & Media Preprocessing | Done | `src/lib/media-utils.ts` does image compression (≤1280px JPEG), video frame extraction (6 frames), and base64 encoding before model calls. |
| 3 | Deep Learning Model Development for Fake Detection | Done (hosted) | Uses Gemini 2.5 Pro / Flash via Lovable AI Gateway with a strict forensic system prompt + reviewer pass + score normalization in `src/lib/detection.functions.ts`. (We use a hosted multimodal model rather than training a custom model — appropriate for a web app.) |
| 4 | Image, Video & Audio Analysis using AI | Done | `analyzeImage`, `analyzeVideo`, `analyzeAudio` server functions wired to `/detect/image|video|audio` pages. |
| 5 | Real-Time Detection & Verification Engine | Partial | Single-shot analysis works, but there is no live progress streaming, no webcam/mic capture path, and no in-page re-verify. |
| 6 | Web Application & Backend Integration | Done | TanStack Start app, Lovable Cloud auth + RLS, `media_files` / `detection_results` / `reports` / `notifications` tables, storage bucket, history page. |
| 7 | Testing, Deployment & Performance Optimization | Partial | Performance optimizations done (image downscale, conditional reviewer pass, 45s timeout, flash model for image/audio). No automated test suite, no published deploy. Reports page is just a pointer — no per-scan report actions from History. |

## What to implement

Three focused additions that close the gaps without rewriting working modules.

### A. Real-Time Detection & Verification Engine
Add live capture + streaming progress so module 5 is genuinely "real-time".

1. **Webcam / mic capture** on each detect page:
   - Image: "Capture from webcam" button → `getUserMedia({ video })`, snapshot to canvas, feed into existing `analyzeImage` pipeline.
   - Audio: "Record from mic" button → `MediaRecorder` (webm/opus, 10s cap), feed into `analyzeAudio`.
   - Video: keep file upload (browser webm recording is heavy; out of scope).
2. **Live progress events**: replace the fixed 5-stage progress bar with a per-step state machine driven by actual await points (`compressing → uploading → extracting → calling AI → reviewer → scoring`). Surface elapsed seconds.
3. **Auto re-verify**: on the result panel, add a "Re-run verification" button that re-calls the server fn on the same compressed payload (already in memory) — useful when AI returns low confidence.

### B. Reports module (close history → report loop)
Currently `/reports` is a stub. Make it the actual report center.

1. Pull recent `detection_results` joined with `media_files`.
2. Per row: PDF / CSV / JSON download buttons that call `buildPdf/Csv/Json` from `src/lib/reports.ts` using the stored analysis (no re-running AI).
3. From `/history` add a "View report" link to `/reports#<id>` that scrolls + highlights.

### C. Requirement Analysis & Architecture page
Add an in-app `/architecture` route (linked from sidebar footer) that renders:

- System overview diagram (ASCII / SVG): client → TanStack server fn → Lovable AI Gateway → Gemini; Supabase auth/storage/db side.
- Module table mirroring this audit, marked Done.
- Data model summary (tables + RLS in one paragraph each).
- Pipeline diagram per media type (preprocess → model → normalize → store).

Pure static content, no backend changes.

### D. Performance + testing polish
- Add a tiny `vitest` smoke test for `normalize()` and `extractJson()` in `src/lib/detection.functions.ts` (pure functions, no network) so module 7 has automated coverage.
- Add a `<noscript>` fallback and ensure the detect page disables the Run button while `running` (already done) and aborts in-flight fetch on unmount via `AbortController` plumbed into `callModel` (skipped if it widens scope too much — flag below).

## Out of scope / explicit non-goals
- Training a custom CNN/transformer locally (not feasible in this stack; we rely on hosted multimodal models, which is the standard production pattern).
- Live video deepfake streaming analysis (frame-by-frame WebRTC inference) — too expensive on the gateway.
- Replacing the new light "Navy Trust" theme.

## Files to add / change

- `src/routes/_app/reports.tsx` — replace stub with real reports table.
- `src/routes/_app/architecture.tsx` — new page.
- `src/routes/_app.tsx` — add "Architecture" sidebar entry.
- `src/routes/_app/detect.$type.tsx` — webcam/mic capture buttons, live stage updates, re-run button.
- `src/lib/media-utils.ts` — add `captureWebcamFrame()` and `recordAudio(seconds)` helpers.
- `src/lib/reports.ts` — no change (already exports builders).
- `src/lib/detection.normalize.test.ts` — new vitest smoke test.

Confirm and I'll implement A + B + C + D in build mode.