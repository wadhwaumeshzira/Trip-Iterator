import { z } from "zod";

// A stop is one of a few block "kinds" so the frontend can render each
// differently (card / note / travel leg) — this is what lets the AI
// return varied structured blocks instead of one flat shape.
export const StopSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["place", "note", "travel"]).default("place"),
  name: z.string().min(1).max(120),
  time: z.string().max(40).optional().default(""),
  description: z.string().max(400).optional().default(""),
});

export const DaySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(80),
  stops: z.array(StopSchema).min(1).max(10),
});

export const ItinerarySchema = z.object({
  tripTitle: z.string().min(1).max(120),
  summary: z.string().max(400).optional().default(""),
  days: z.array(DaySchema).min(1).max(21),
});

export function parseItinerary(raw, expectedDays) {
  let json;
  try {
    if (typeof raw === "string") {
      const match = raw.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : raw;
      json = JSON.parse(jsonStr);
    } else {
      json = raw;
    }
  } catch (err) {
    return { ok: false, error: "The response wasn't valid JSON." };
  }

  const result = ItinerarySchema.safeParse(json);
  if (!result.success) {
    return {
      ok: false,
      error: "The response didn't match the expected itinerary shape.",
      issues: result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  if (expectedDays && result.data.days.length !== expectedDays) {
    return {
      ok: false,
      error: `Expected ${expectedDays} day(s) but the response had ${result.data.days.length}.`,
    };
  }

  return { ok: true, data: result.data };
}
