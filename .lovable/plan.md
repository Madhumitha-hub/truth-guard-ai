## Goal

Make the detection result panel directly answer the question "Is this AI-generated?" — not just show "Authentic / Suspicious / Fake".

## Scope

Frontend-only change to `src/routes/_app/detect.$type.tsx`. No backend, schema, AI prompt, or detection logic changes.

## Changes

1. **AI-Generated verdict badge** next to the prediction, derived from `manipulation_score`:
   - `< 30` → **"Not AI-Generated"** — green/success tone
   - `30–65` → **"Possibly AI-Generated"** — amber/warning tone
   - `> 65` → **"AI-Generated / Deepfake"** — red/destructive tone

2. **Plain-English one-liner** under the prediction header, e.g.:
   - *"This image appears to be a real photograph, not AI-generated."*
   - *"This media shows signs of manipulation — review carefully."*
   - *"This media is likely AI-generated or a deepfake."*
   Wording adapts to media type (image / video / audio) and the band above.

3. Keep all existing UI: shield icon, prediction text, risk level, three score bars, AI explanation, findings list, PDF/CSV/JSON download buttons.

## Out of scope

- Module gaps (no test suite, no admin dashboard, no deployment, no trained DL model). Tracked separately; can be addressed in follow-up turns.
- Any change to detection accuracy or the AI prompt.
