// Server functions that run real AI-assisted media analysis via Lovable AI Gateway.
// Each function performs actual inference against Google Gemini multimodal models
// — no random or hard-coded scores.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import {
  DetectionAnalysisSchema,
  classifyRisk,
  type DetectionAnalysis,
} from "./detection-types";

const SYSTEM_PROMPT = `You are DeepGuard AI, an expert forensic analyst specialised in detecting AI-generated and manipulated media (deepfakes, face swaps, GAN-generated faces, voice cloning, synthetic speech, video tampering).

Examine the provided media closely. Look for: facial inconsistencies, unnatural skin texture, eye/teeth artefacts, lighting mismatch, edge/boundary artefacts, GAN fingerprints, lip-sync mismatch (video), unnatural blinking, frequency anomalies (audio), synthetic speech markers, prosody irregularities, compression inconsistencies.

Return STRICTLY a JSON object matching the schema. Scores are 0-100. authenticity_score + manipulation_score should sum to ~100. confidence_score reflects how sure you are.

Risk rules: manipulation 0-30 = Low, 31-60 = Medium, 61-100 = High.
Prediction rules: manipulation < 30 = "Authentic", 30-65 = "Suspicious", > 65 = "Fake".

Write a 2-4 sentence human-readable explanation. List 2-6 concrete findings.`;

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

async function runAnalysis(
  mediaParts: Array<
    | { type: "text"; text: string }
    | { type: "image"; image: string; mimeType?: string }
    | { type: "file"; data: string; mediaType: string }
  >,
  mediaType: "image" | "video" | "audio",
): Promise<DetectionAnalysis> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("AI service not configured. LOVABLE_API_KEY missing.");

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway("google/gemini-2.5-pro");

  const { experimental_output } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        // @ts-expect-error - multimodal content parts
        content: [
          { type: "text", text: `Analyse this ${mediaType} for signs of deepfake or AI manipulation. Be objective and rigorous.` },
          ...mediaParts,
        ],
      },
    ],
    experimental_output: Output.object({ schema: DetectionAnalysisSchema }),
  });

  const parsed = experimental_output;
  // Enforce consistency between manipulation_score and risk_level
  return { ...parsed, risk_level: classifyRisk(parsed.manipulation_score) };
}

export const analyzeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImageInput.parse(d))
  .handler(async ({ data }) => {
    const started = Date.now();
    const analysis = await runAnalysis(
      [{ type: "image", image: `data:${data.mimeType};base64,${data.imageBase64}`, mimeType: data.mimeType }],
      "image",
    );
    return { analysis, processingMs: Date.now() - started, model: "google/gemini-2.5-pro" };
  });

export const analyzeVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => VideoInput.parse(d))
  .handler(async ({ data }) => {
    const started = Date.now();
    const parts = data.framesBase64.map((b64) => ({
      type: "image" as const,
      image: `data:image/jpeg;base64,${b64}`,
      mimeType: "image/jpeg",
    }));
    const analysis = await runAnalysis(
      [
        { type: "text", text: `${data.framesBase64.length} sampled frames are attached. Examine temporal consistency, face-boundary stability, lip-sync, and blinking patterns across frames.` },
        ...parts,
      ],
      "video",
    );
    return { analysis, processingMs: Date.now() - started, model: "google/gemini-2.5-pro" };
  });

export const analyzeAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AudioInput.parse(d))
  .handler(async ({ data }) => {
    const started = Date.now();
    const analysis = await runAnalysis(
      [{ type: "file", data: data.audioBase64, mediaType: data.mimeType }],
      "audio",
    );
    return { analysis, processingMs: Date.now() - started, model: "google/gemini-2.5-pro" };
  });
