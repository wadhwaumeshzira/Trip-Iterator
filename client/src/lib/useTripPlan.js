import { useCallback, useRef, useState } from "react";
import { planTrip } from "./api";

export function useTripPlan() {
  const [status, setStatus] = useState("idle"); // idle | loading | error | success
  const [itinerary, setItinerary] = useState(null);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);
  const lastArgsRef = useRef(null);

  const generate = useCallback(async (prompt, days) => {
    lastArgsRef.current = { prompt, days };
    const thisRequestId = ++requestIdRef.current;

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setError(null);

    try {
      const data = await planTrip(prompt, days, { signal: controller.signal });
      if (thisRequestId !== requestIdRef.current) return;
      setItinerary(data);
      setStatus("success");
    } catch (err) {
      if (thisRequestId !== requestIdRef.current) return;
      if (err.name === "AbortError") return;
      setError(err.message || "Something went wrong generating your trip.");
      setStatus("error");
    }
  }, []);

  const retry = useCallback(() => {
    const args = lastArgsRef.current;
    if (args) generate(args.prompt, args.days);
  }, [generate]);

  return { status, itinerary, error, generate, retry, setItinerary };
}
