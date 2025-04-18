import { z } from "zod";

export const CollectFromLinkSchema = z.object({
  link: z.string(),
});

export const ParsePdfSchema = z.object({
  content: z.string(),
});

export const NewsSchema = z.object({
  url: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(
    z.enum([
      "AI",
      "HARDWARE",
      "FRONTEND",
      "BACKEND",
      "SECURITY",
      "IOT",
      "CLOUD",
      "STARTUPS",
      "DATA",
      "TOOL",
    ])
  ),
});

export const NewsArraySchema = z.array(NewsSchema);
