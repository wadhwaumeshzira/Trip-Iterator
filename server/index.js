import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { parseItinerary } from "./schema.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 30000;

function buildSystemPrompt(days) {
  return `You are a meticulous, well-travelled trip planner. Given a free-form trip description, return ONLY a single JSON object — no prose, no markdown fences, no commentary before or after.

The itinerary must cover exactly ${days} day${days === 1 ? "" : "s"}, numbered "day-1" through "day-${days}", in order, with no days skipped or merged.

The JSON must match this exact shape:
{
  "tripTitle": string (specific and evocative, not generic — mention the destination),
  "summary": string (2-3 sentences: overall vibe, pace, and what makes this itinerary distinct),
  "days": [
    {
      "id": string (e.g. "day-1"),
      "title": string (e.g. "Day 1 - Arrival and old town"),
      "stops": [
        {
          "id": string (unique, e.g. "day-1-stop-1"),
          "kind": "place" | "note" | "travel",
          "name": string (specific — a real-sounding venue, landmark, or neighborhood name, not "local restaurant"),
          "time": string (e.g. "9:00 AM", or "" if not applicable),
          "description": string (2-4 sentences: what to actually do there, why it's worth the stop, and one concrete, specific detail — a dish to order, a viewpoint, a booking tip, or a timing note)
        }
      ]
    }
  ]
}

Rules:
- Each day needs 4 to 6 stops: a realistic full day, not a sparse skeleton. Include meals, not just sights.
- Use "kind": "travel" for transit legs (flights, trains, transfers, intercity legs), "note" for practical tips (booking ahead, what to pack, local etiquette), "place" for everything else.
- Descriptions should read like a knowledgeable friend's notes, not a brochure — be specific and concrete, never vague filler like "enjoy the atmosphere."
- Vary pacing across days: an arrival day is lighter, a full day in a destination is fuller.
- Every id must be unique across the whole response.
- Return raw JSON only. Do not wrap it in \`\`\`json or any other text.`;
}

async function callGroq(userPrompt, systemPrompt, { signal }) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 3200,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGroqChat(messages, { signal }) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Groq API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

app.post("/api/plan-trip", async (req, res) => {
  const { prompt, days: rawDays } = req.body || {};
  const days = Math.min(21, Math.max(1, Number(rawDays) || 4));

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ ok: false, error: "Describe your trip first." });
  }
  if (!GROQ_API_KEY) {
    return res.status(500).json({ ok: false, error: "Server is missing GROQ_API_KEY." });
  }

  const systemPrompt = buildSystemPrompt(days);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    let raw = await callGroq(prompt, systemPrompt, { signal: controller.signal });
    let result = parseItinerary(raw, days);

    if (!result.ok) {
      const retryPrompt = `${prompt}\n\nYour previous response failed validation (${result.error}). Return ONLY the corrected raw JSON object, matching the required shape exactly, still covering exactly ${days} day(s).`;
      raw = await callGroq(retryPrompt, systemPrompt, { signal: controller.signal });
      result = parseItinerary(raw, days);
    }

    clearTimeout(timeout);

    if (!result.ok) {
      return res.status(422).json({ ok: false, error: result.error, issues: result.issues });
    }
    return res.json({ ok: true, data: result.data });
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return res.status(504).json({ ok: false, error: "The model took too long to respond." });
    }
    return res.status(502).json({ ok: false, error: err.message || "Failed to reach the model." });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, itinerary, history = [] } = req.body || {};
  
  if (!message) {
    return res.status(400).json({ error: "Message required" });
  }

  if (!itinerary) {
    return res.json({ reply: "Please plan a trip first using the form on the left. Once you have an itinerary, I can help you with specific questions, recommendations, or details about it!" });
  }

  const sysPrompt = `You are "AI Guide", a helpful, enthusiastic travel assistant. The user has generated the following trip itinerary:\n\n${JSON.stringify(itinerary, null, 2)}\n\nAnswer the user's questions about this trip. Be concise, friendly, and answer naturally. Do not use markdown fences for the whole response.`;

  const messages = [
    { role: "system", content: sysPrompt },
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: "user", content: message }
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const reply = await callGroqChat(messages, { signal: controller.signal });
    clearTimeout(timeout);
    res.json({ reply });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Failed to get response from AI Guide" });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
