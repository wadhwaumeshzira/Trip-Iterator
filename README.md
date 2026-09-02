# Trip Iterator

A free-form trip description plus a day count goes in, an AI-generated day-by-day
itinerary comes out as interactive UI — a timeline of stops per day, remove one you
don't want, drag to reorder within a day. Not a chatbot: the model returns structured
JSON that's validated and rendered as real components, never printed as raw text.

The day count is asked for explicitly (a stepper next to the prompt) rather than left
for the model to infer from prose, and the backend both prompts for and validates
against that exact count — so "8 days" in the text description can't silently become
6 days in the response.

On top of the itinerary generator, there's an **AI Guide**: a small floating chat
widget the user can open once a trip exists, to ask free-form questions about that
specific itinerary ("is day 3 too packed?", "any vegetarian options near the first
stop?"). This part *is* conversational by design — it's a companion to the structured
planner, not a replacement for it, and the two are backed by separate endpoints.

## Stack

- **Frontend**: React (Vite), plain CSS, `@dnd-kit` for drag-to-reorder.
- **Backend**: small Express proxy, so the Groq API key never reaches the browser.
- **Model**: Groq API, `openai/gpt-oss-20b` (Groq deprecated the old Llama chat models in
  2026 — this is the current recommended general-purpose model on their free tier).
- **Validation**: Zod, server-side, gating every itinerary response before it's ever
  sent to the client.

## Setup

Requires Node 18+.

```bash
# 1. Backend
cd server
cp .env.example .env        # add your GROQ_API_KEY (free at console.groq.com)
npm install
npm run dev                 # http://localhost:8787

# 2. Frontend (new terminal)
cd client
cp .env.example .env        # defaults to the backend above, edit if needed
npm install
npm run dev                 # http://localhost:5173
```

Open the frontend URL, describe a trip, set the day count, and the itinerary renders
below the form. Once a trip exists, the "AI Guide" button in the bottom-right opens a
chat panel scoped to that itinerary.

## Two AI features, two different jobs

This app deliberately uses the model in two different modes, because they're solving
different problems:

| | Trip planner | AI Guide |
|---|---|---|
| Endpoint | `POST /api/plan-trip` | `POST /api/chat` |
| Output | Structured JSON, schema-enforced | Free-form conversational text |
| Validated? | Yes — Zod schema, retried once on failure | No — this one *is* meant to be a chat |
| Renders as | Interactive components (timeline, cards, drag/reorder) | Chat bubbles |
| Why | The core requirement: unpredictable AI output turned into reliable UI | A conversational layer on top, once structured data already exists |

The planner is the part that has to be bulletproof against malformed output, since its
result becomes app state. The guide is intentionally simpler — it's a bounded
question-answering feature with the current itinerary as context, sent fresh on every
message along with the prior chat history, and its failure mode is a plain error
bubble rather than blocking the app.

## How failure is handled

This was the actual point of the assignment, so here's what's built and why:

- **Server-side validation, not trust.** The planner's raw output is parsed against a
  Zod schema (`server/schema.js`) before it's ever sent to the client. Wrong shape,
  missing fields, invalid JSON, or a day count that doesn't match what was asked for
  never reach the frontend as "data" — they come back as a typed error.
- **One automatic retry.** If validation fails the first time, the server re-prompts the
  model once with the specific validation error included, before giving up and returning
  a 422. This catches most one-off formatting slips without extra client complexity.
- **Timeouts.** Requests to Groq (both the planner and the guide chat) are aborted after
  30s server-side, so a hung request can't leave the UI stuck in a loading state forever.
- **Stale-response guarding.** The frontend (`client/src/lib/useTripPlan.js`) tracks a
  request id and aborts the previous in-flight planner request whenever a new one
  starts. If a slow response does come back after being superseded, it's dropped rather
  than overwriting newer state.
- **Explicit states everywhere.** `idle`, `loading`, `error`, `success` are separate,
  rendered states for the planner — there's no ambiguous in-between where the UI shows
  stale or half-formed data. The AI Guide has its own lighter loading/error handling
  (a "Thinking…" bubble, a fallback message on failure) appropriate to a chat surface.
- **No crashes on bad output.** Every stage that can fail (JSON.parse, Zod validation,
  the network call itself) is wrapped so a bad response becomes a visible, retryable
  error message instead of a thrown exception.

## Design

Distinctive visual direction rather than a default component-library look: an
"atlas / field notes" theme (ink navy shell, paper-white content cards, a route-red
accent, Fraunces/Inter type pairing), a timeline layout for stops with a connecting
line and per-kind icons (place / travel / note), staggered entrance animations, and a
small custom compass-mark logo/favicon. The AI Guide is a floating panel so it stays
out of the way of the main planning flow until the user wants it.

## AI usage note

I used Claude to scaffold this project: discussing the model/provider choice, designing
the architecture (Express proxy → Groq → Zod validation → React state, with the retry
and stale-response logic), generating the initial component/file structure, adding the
AI Guide chat feature, and writing the CSS design system. I reviewed, adjusted, and
tested everything rather than shipping generated code I hadn't read — I can walk
through and explain any part of it, including the drag-reorder logic, the retry flow,
and how the AI Guide's context/history is assembled, in the interview.

## Known limitations

- Only one retry is attempted server-side for the planner; after that, the user has to
  manually retry from the UI. A more resilient version would use exponential backoff
  and multiple retries with jitter.
- The AI Guide has no validation on its replies since it's intentionally free-text — it
  can occasionally say something not perfectly grounded in the itinerary. It doesn't
  currently edit the itinerary itself, only discusses it.
- No persistence — refreshing the page loses both the current itinerary and the guide's
  chat history. The itinerary's data shape (`ItinerarySchema`) is already serializable,
  so this would mostly be a `localStorage` or backend persistence layer, not a
  data-model change.
- No streaming — both the itinerary and the guide's replies appear all at once rather
  than token-by-token. Noted as a stretch goal; didn't fit in the time budget.
- Minimal automated tests — validated manually against a range of prompts (short trips,
  long trips, vague prompts, deliberately malformed model output via a mocked response)
  rather than with a test suite, given the time budget.

## Time spent

Roughly 8.5 hours: ~1.5h on architecture/provider decisions, ~2h on backend (proxy,
schema, retry/timeout logic), ~3.5h on frontend (state management, drag-reorder,
styling, UI polish pass), ~1h on the AI Guide chat feature, ~0.5h on testing failure
paths and writing this README.
