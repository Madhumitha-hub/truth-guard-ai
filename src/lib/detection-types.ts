// Schemas + types shared across detection flows.
import { z } from "zod";

export const MediaTypeSchema = z.enum(["image", "video", "audio"]);
export type MediaType = z.infer<typeof MediaTypeSchema>;

export const PredictionSchema = z.enum(["Authentic", "Suspicious", "Fake"]);
export const RiskSchema = z.enum(["Low", "Medium", "High"]);

export const DetectionAnalysisSchema = z.object({
  prediction: PredictionSchema,
  authenticity_score: z.number().min(0).max(100),
  manipulation_score: z.number().min(0).max(100),
  confidence_score: z.number().min(0).max(100),
  risk_level: RiskSchema,
  explanation: z.string().min(20).max(2000),
  findings: z.array(z.object({
    category: z.string(),
    detail: z.string(),
    severity: z.enum(["low", "medium", "high"]),
  })).max(10),
});

export type DetectionAnalysis = z.infer<typeof DetectionAnalysisSchema>;

export function classifyRisk(manipulation: number): "Low" | "Medium" | "High" {
  if (manipulation <= 30) return "Low";
  if (manipulation <= 60) return "Medium";
  return "High";
}

export const IMAGE_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
export const VIDEO_MIME = ["video/mp4", "video/quicktime", "video/x-matroska", "video/x-msvideo"];
export const AUDIO_MIME = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/aac", "audio/flac", "audio/mp3"];

export const MAX_BYTES = {
  image: 10 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
} as const;
