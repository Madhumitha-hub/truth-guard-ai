## Why the current analysis is not accurate enough

The current verification is **prompt-only**: it sends the uploaded image/video/audio to one general multimodal AI model and trusts a single JSON response. That can misclassify realistic AI-generated media as authentic because:

- It mainly asks for visible manipulation/deepfake artifacts, so a clean AI-generated image with few obvious flaws can be scored as “Authentic”.
- Image and audio use a faster model, not the strongest forensic reasoning model.
- Video analysis only samples 4 frames, so it can miss temporal artifacts.
- There is no second-pass verification or consistency check.
- The app treats `manipulation_score < 30` as “Not AI-Generated”, even when confidence is low or findings are uncertain.

Important note: no browser app can guarantee 100% deepfake detection for every AI image/video/audio without a trained forensic model and benchmark dataset, but we can make this much more reliable and conservative.

## Plan

1. **Strengthen the AI forensic prompt**
   - Explicitly distinguish:
     - camera-authentic media
     - AI-generated synthetic media
     - edited/manipulated media
     - uncertain media
   - Add instructions that “no obvious artifacts” must not automatically mean authentic.
   - Require the model to consider synthetic-media signs such as overly coherent textures, impossible fine details, rendering artifacts, facial/hand/teeth/eye irregularities, cloned voice prosody, and AI video temporal instability.

2. **Use a stronger model for verification**
   - Move image/audio checks from the faster model to a stronger reasoning/multimodal model.
   - Keep video on a strong model and increase sampled frames from 4 to 8 for better temporal coverage.

3. **Add a second verification pass**
   - Run a reviewer pass after the first analysis.
   - The reviewer checks whether the verdict is too optimistic and returns either:
     - keep the original verdict
     - raise it to Suspicious
     - raise it to Fake / AI-Generated
   - This reduces false “Not AI-Generated” results.

4. **Make scoring conservative**
   - If confidence is low or the model reports uncertainty, do not label the media “Not AI-Generated”.
   - Use “Possibly AI-Generated” for uncertain cases instead of incorrectly saying authentic.
   - Normalize scores so prediction, risk level, and badge always agree.

5. **Improve media-specific checks**
   - Image: focus on synthetic rendering artifacts, facial symmetry, skin texture, hands, text, backgrounds, lighting, and metadata-style reasoning.
   - Video: use more frames and ask for cross-frame consistency, face-boundary stability, blinking, and lip-sync checks.
   - Audio: ask for voice-cloning markers, prosody irregularity, breath/noise-floor issues, cadence, and spectral-style anomalies.

6. **Improve displayed result wording**
   - Replace overly certain “Not AI-Generated” wording with calibrated labels:
     - “Likely Authentic”
     - “Possibly AI-Generated”
     - “Likely AI-Generated / Deepfake”
   - Show that AI verification is probabilistic, not absolute.

## Files to update

- `src/lib/detection.functions.ts`
  - stronger prompts
  - stronger model selection
  - second-pass reviewer
  - conservative score normalization

- `src/lib/detection-types.ts`
  - optional extra fields if needed for verification notes / uncertainty

- `src/lib/media-utils.ts`
  - increase video frame extraction support

- `src/routes/_app/detect.$type.tsx`
  - pass more video frames
  - display calibrated verdict wording

## Expected result

AI-generated images, videos, and audio should be much less likely to appear as “Not AI-Generated”. Uncertain media will be shown as “Possibly AI-Generated” rather than incorrectly marked authentic.