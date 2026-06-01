## Why it's timing out

The server function `analyzeImage` is hitting the Worker / edge gateway timeout (~60s), so the browser sees **504 upstream request timeout**. Three things stack up to cause it:

1. **Huge upload** — the image is sent as a ~2 MB PNG re-encoded as base64 (~2.7 MB JSON) to the server function. The PNG you uploaded also has a big embedded C2PA manifest, making it even larger. Just shipping the bytes eats a big chunk of the budget.
2. **Two sequential Gemini 2.5 Pro calls** — current code does a forensic pass *and* a reviewer pass with `google/gemini-2.5-pro` (the slowest model). Each call can take 20–40s; back-to-back they routinely exceed the gateway limit.
3. **No timeout / retry guard** — if Gemini is slow, we just wait until the platform kills the request.

Video/audio have the same shape and will hit the same wall (video is even worse — 8 frames × Pro × 2 passes).

## Plan

Keep accuracy improvements, but get the request under the timeout.

1. **Downscale + recompress images in the browser before upload**
   - In `src/lib/media-utils.ts`, add `compressImageForAnalysis(file)` that draws the image to a canvas at max 1280px on the long edge and exports JPEG quality 0.85. Fall back to original if it's already small.
   - In `src/routes/_app/detect.$type.tsx`, run image uploads through this helper before calling `analyzeImage`. (Storage upload of the original file is unchanged — only the AI payload is shrunk.)
   - Cuts the base64 payload from ~2.7 MB to ~150–300 KB and removes the C2PA blob the model doesn't need.

2. **Single-pass analysis by default, reviewer only when needed**
   - In `src/lib/detection.functions.ts`, change `runTwoPass`:
     - Always run pass 1.
     - Only run the reviewer pass when pass 1 returns `prediction === "Authentic"` AND `confidence_score < 80`. Skip reviewer for already-Suspicious/Fake results and for high-confidence Authentic.
   - This keeps the conservative behaviour for the case that matters (false negatives on AI-generated media) but avoids the second round-trip on most uploads.

3. **Faster model for image and audio, Pro only for video**
   - Image + audio: switch to `google/gemini-2.5-flash` (still strong multimodal, much faster). Video keeps `google/gemini-2.5-pro` because temporal reasoning benefits from it.
   - Reduces a typical image call from ~25–40s to ~6–12s.

4. **Reduce video frames from 8 → 6**
   - 6 frames is plenty for temporal checks and keeps the single Pro call well under the limit. Update the call site in `detect.$type.tsx` and keep `extractVideoFrames` flexible.

5. **Per-call timeout + clearer error**
   - Wrap each `generateText` call in `Promise.race` with a 45s timeout inside `callModel`.
   - On timeout, throw a typed error so the client can show "AI service is busy, please retry" instead of the raw "upstream request timeout".
   - In `detect.$type.tsx`, catch and toast a friendly message; offer a retry button.

6. **No behaviour change for scoring / wording**
   - `normalize()`, the calibrated badges ("Likely Authentic" / "Possibly AI-Generated" / "Likely AI-Generated / Deepfake"), and the strict forensic prompt all stay. We're only changing *how much* work each request does, not the verdict logic.

## Files to update

- `src/lib/media-utils.ts` — add `compressImageForAnalysis`; keep `extractVideoFrames` (default to 6).
- `src/routes/_app/detect.$type.tsx` — compress images before `analyzeImage`; pass 6 frames; nicer error toast.
- `src/lib/detection.functions.ts` — image/audio use `gemini-2.5-flash`, video stays on `gemini-2.5-pro`; reviewer pass becomes conditional; add 45s per-call timeout.

## Expected result

- AI image verification completes in roughly 6–15s instead of 50–70s, so no more 504 / "upstream request timeout".
- AI-generated media is still flagged conservatively (reviewer pass still runs on the borderline "Authentic + low confidence" case, which is exactly where false negatives happen).
- Video and audio paths also fit inside the timeout.