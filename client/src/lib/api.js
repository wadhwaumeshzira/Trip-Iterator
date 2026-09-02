const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8787";

/**
 * Fetches a trip itinerary from the backend. Accepts a requestId so callers
 * can detect and ignore stale responses (e.g. the user typed a new prompt
 * before the first request finished).
 */
export async function planTrip(prompt, days, { signal } = {}) {
  const res = await fetch(`${API_BASE}/api/plan-trip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, days }),
    signal,
  });

  const body = await res.json().catch(() => ({
    ok: false,
    error: "The server returned something that wasn't valid JSON.",
  }));

  if (!res.ok || !body.ok) {
    throw new Error(body.error || `Request failed (${res.status}).`);
  }

  return body.data;
}

export async function chatWithGuide(message, itinerary, history = []) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, itinerary, history }),
  });

  const body = await res.json().catch(() => ({
    error: "The server returned something that wasn't valid JSON.",
  }));

  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status}).`);
  }

  return body.reply;
}
