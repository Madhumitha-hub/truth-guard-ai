// Server functions that run real AI-assisted media analysis via Lovable AI Gateway.
// Uses prompt-based JSON output with robust extraction/validation instead of
// experimental_output, which is unreliable through the OpenAI-compatible
// Gemini surface.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  DetectionAnalysisSchema,
  classifyRisk,
  type DetectionAnalysis,
} from "./detection-types";

const JSON_SHAPE = `{
  "prediction": "Authentic" | "Suspicious" | "Fake",
  "authenticity_score": number (0-100),
  "manipulation_score": number (0-100),
  "confidence_score": number (0-100),
  "risk_level": "Low" | "Medium" | "High",
  "explanation": string (20-2000 chars, 2-4 sentences),
  "findings": [ { "category": string, "detail": string, "severity": "low" | "medium" | "high" } ]  // 2-6 items
}`;

const SYSTEM_PROMPT = `You are DeepGuard AI, an expert forensic analyst specialised in detecting AI-generated and manipulated media (deepfakes, face swaps, GAN-generated faces, voice cloning, synthetic speech, video tampering).

Examine the provided media closely. Look for: facial inconsistencies, unnatural skin texture, eye/teeth artefacts, lighting mismatch, edge/boundary artefacts, GAN fingerprints, lip-sync mismatch (video), unnatural blinking, frequency anomalies (audio), synthetic speech markers, prosody irregularities, compression inconsistencies.

Risk rules: manipulation 0-30 = Low, 31-60 = Medium, 61-100 = High.
Prediction rules: manipulation < 30 = "Authentic", 30-65 = "Suspicious", > 65 = "Fake".
authenticity_score + manipulation_score should sum to ~100.

CRITICAL OUTPUT RULES:
- Reply with ONLY a single valid JSON object. No prose, no markdown, no code fences.
- The JSON MUST match this exact shape:
${JSON_SHAPE}
- Include 2 to 6 findings. Each finding must have "category", "detail", "severity".
- Keep "explanation" between 20 and 2000 characters.`;

// Robust JSON extraction: strip fences, locate braces, fix trailing commas / control chars.
function extractJson(raw: string): unknown {
  let s = raw.trim();
  s = s.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI returned no JSON object");
  }
  s = s.slice(start, end + 1);
  try {
    return JSON.parse(s);
  } catch {
    const cleaned = s
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    return JSON.parse(cleaned);
  }
}

const ImageInput = z.object({
  imageBase64: z.string().min(10),
  mimeType: z.string(),
  filename: z.string().max(255),
});

const AudioInput = z.object({
  audioBase64: z.string().min(10),
  mimeType: z.string(),
  filename: z.string().max(255),
});

const VideoInput = z.object({
  framesBase64: z.array(z.string().min(10)).min(1).max(8),
  filename: z.string().max(255),
});

type MediaPart =
  | { type: "text"; text: string }
  | { type: "image"; image: string; mimeType?: string }
  | { type: "file"; data: string; mediaType: string };

async function runAnalysis(
  mediaParts: MediaPart[],
  mediaType: "image" | "video" | "audio",
  modelId: string,
): Promise<DetectionAnalysis> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service not configured. LOVABLE_API_KEY missing.");

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway(modelId);

  const result = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyse this ${mediaType} for signs of deepfake or AI manipulation. Be objective and rigorous. Return ONLY the JSON object — no other text.`,
          },
          ...mediaParts,
        ] as never,
      },
    ],
    providerOptions: {
      lovable: { max_tokens: 4096, temperature: 0.4 },
    },
  });

  let parsedJson: unknown;
  try {
    parsedJson = extractJson(result.text ?? "");
  } catch (e) {
    const snippet = (result.text ?? "").slice(0, 200);
    throw new Error(
      `AI returned invalid JSON: ${e instanceof Error ? e.message : "parse error"}. Snippet: ${snippet}`,
    );
  }

  const validated = DetectionAnalysisSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error(
      `AI response failed schema validation: ${validated.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    );
  }

  return { ...validated.data, risk_level: classifyRisk(validated.data.manipulation_score) };
}

export const analyzeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const started = Date.now();
    const model = "google/gemini-2.5-flash";
    const analysis = await runAnalysis(
      [{ type: "image", image: `data:${data.mimeType};base64,${data.imageBase64}`, mimeType: data.mimeType }],
      "image",
      model,
    );
    return { analysis, processingMs: Date.now() - started, model };
  });

export const analyzeVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VideoInput.parse(d))
  .handler(async ({ data }) => {
    const started = Date.now();
    const model = "google/gemini-2.5-pro";
    const parts: MediaPart[] = data.framesBase64.map((b64) => ({
      type: "image",
      image: `data:image/jpeg;base64,${b64}`,
      mimeType: "image/jpeg",
    }));
    const analysis = await runAnalysis(
      [
        {
          type: "text",
          text: `${data.framesBase64.length} sampled frames are attached. Examine temporal consistency, face-boundary stability, lip-sync, and blinking patterns across frames.`,
        },
        ...parts,
      ],
      "video",
      model,
    );
    return { analysis, processingMs: Date.now() - started, model };
  });

export const analyzeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AudioInput.parse(d))
  .handler(async ({ data }) => {
    const started = Date.now();
    const model = "google/gemini-2.5-flash";
    const analysis = await runAnalysis(
      [{ type: "file", data: data.audioBase64, mediaType: data.mimeType }],
      "audio",
      model,
    );
    return { analysis, processingMs: Date.now() - started, model };
  });
