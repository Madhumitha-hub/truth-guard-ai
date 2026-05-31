
## Problem

When clicking "Run AI verification", the call fails with `No object generated: response did not match schema.` This error is thrown by the AI SDK's `experimental_output` / `Output.object` path when the model's response can't be parsed into the Zod schema.

Root causes on the Lovable AI Gateway (OpenAI-compatible) with `google/gemini-2.5-pro`:

1. `experimental_output` relies on the provider supporting OpenAI-style `response_format: json_schema` strict mode. The Lovable gateway's OpenAI-compatible surface for Gemini doesn't reliably enforce that, so Gemini often returns prose / partial JSON / markdown-fenced JSON, and the SDK rejects it.
2. Gemini 2.5 Pro can also hit `MAX_TOKENS` and truncate the JSON for video (6 frames) and audio.
3. No fallback parser — a single schema mismatch kills the whole request.

## Fix

Rewrite `src/lib/detection.functions.ts` to stop using `experimental_output` and instead:

1. Ask the model for JSON directly with a strict prompt that includes the exact JSON shape.
2. Use plain `generateText` (no `Output.object`) and read `result.text`.
3. Parse with a robust extractor that:
   - strips ```json fences,
   - locates the first `{` and matching last `}`,
   - fixes trailing commas / control chars,
   - retries `JSON.parse` after cleanup.
4. Validate the parsed object with the existing `DetectionAnalysisSchema` (`safeParse`). If validation fails, throw a clear error including a short snippet of the raw text so the toast is actionable.
5. Switch the default model to `google/gemini-2.5-flash` for image and audio (faster, cheaper, and more reliable for this JSON task) and keep `google/gemini-2.5-pro` for video (multi-frame reasoning). Both still go through the same gateway helper.
6. Raise an explicit token budget by passing `maxOutputTokens` (via `providerOptions`) so the JSON isn't truncated.
7. Reduce video frame count from 6 → 4 to lower payload size / token usage (the existing `extractVideoFrames` already supports a `frameCount` arg).
8. Keep the `classifyRisk` post-processing so risk is always consistent with `manipulation_score`.

No DB schema, no UI, no auth, no routing changes. The UI in `src/routes/_app/detect.$type.tsx` already handles the returned shape `{ analysis, processingMs, model }` — that contract stays the same.

### Files touched

- `src/lib/detection.functions.ts` — rewrite inference + parsing logic as above.
- `src/routes/_app/detect.$type.tsx` — change `extractVideoFrames(file, 6)` to `extractVideoFrames(file, 4)` (one-line change).

### Out of scope

- No changes to storage, RLS, tables, or report generation.
- No new dependencies.
- Real forensic deepfake accuracy still requires a dedicated trained model; this fix only restores reliable AI-assisted analysis output through the gateway.

### Verification

After the edit:
1. Open `/detect/image`, upload the Obama PNG → should now return a verdict card with scores instead of the red toast.
2. Open `/detect/audio` with a small mp3 → returns a verdict.
3. Open `/detect/video` with a short mp4 → returns a verdict.
4. If the model still occasionally returns malformed JSON, the toast will show a clear message (e.g. "AI returned invalid JSON") instead of the SDK's generic schema error, and the request can be retried.
