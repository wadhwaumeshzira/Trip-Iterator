import { useRef } from "react";
import PromptInput from "./components/PromptInput";
import ItineraryView from "./components/ItineraryView";
import { LoadingState, ErrorState, EmptyState } from "./components/StatusStates";
import { useTripPlan } from "./lib/useTripPlan";
import AIGuide from "./components/AIGuide";
import "./App.css";

function AppHeader() {
  return (
    <header className="app-header">
      <div className="app-logo" aria-hidden="true">
        <svg viewBox="0 0 64 64" width="30" height="30">
          <circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
          <path d="M32 14 L38 30 L32 50 L26 30 Z" fill="var(--route)" />
          <path d="M32 14 L38 30 L32 32 Z" fill="currentColor" />
          <circle cx="32" cy="32" r="3" fill="currentColor" />
        </svg>
      </div>
      <div>
        <h1 className="app-title">Trip Iterator</h1>
        <p className="app-tagline">Describe a trip. Get a day-by-day plan you can reshape.</p>
      </div>
    </header>
  );
}

export default function App() {
  const { status, itinerary, error, generate, retry, setItinerary } = useTripPlan();
  const lastPromptRef = useRef("");

  function handleSubmit(prompt, days) {
    lastPromptRef.current = prompt;
    generate(prompt, days);
  }

  return (
    <div className="app-shell">
      <div className="app-inner">
        <AppHeader />

        <PromptInput onSubmit={handleSubmit} disabled={status === "loading"} />

        <div className="result-area">
          {status === "idle" && <EmptyState />}
          {status === "loading" && <LoadingState />}
          {status === "error" && <ErrorState message={error} onRetry={retry} />}
          {status === "success" && itinerary && (
            <ItineraryView itinerary={itinerary} onChange={setItinerary} />
          )}
        </div>
      </div>
      <AIGuide itinerary={itinerary} />
    </div>
  );
}
