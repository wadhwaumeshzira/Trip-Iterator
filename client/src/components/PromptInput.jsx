import { useState } from "react";

const EXAMPLES = [
  { text: "Lisbon, slow mornings, food markets, a day trip to Sintra", days: 5 },
  { text: "Scottish Highlands, hiking, no cities", days: 3 },
  { text: "Backpacking Japan on a budget, Tokyo to Kyoto by train", days: 10 },
];

export default function PromptInput({ onSubmit, disabled, initialValue = "" }) {
  const [value, setValue] = useState(initialValue);
  const [days, setDays] = useState(4);

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim() || disabled) return;
    onSubmit(value.trim(), Number(days));
  }

  function useExample(ex) {
    setValue(ex.text);
    setDays(ex.days);
  }

  return (
    <form className="prompt-form" onSubmit={handleSubmit}>
      <label className="prompt-label" htmlFor="trip-prompt">
        Where are you headed, and what's the trip like?
      </label>
      <textarea
        id="trip-prompt"
        className="prompt-textarea"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Kyoto in autumn, temples in the morning, quiet izakayas at night, one day trip out of the city"
        rows={3}
      />

      <div className="days-row">
        <label htmlFor="trip-days" className="days-label">
          How many days?
        </label>
        <div className="days-stepper">
          <button
            type="button"
            className="days-btn"
            onClick={() => setDays((d) => Math.max(1, d - 1))}
            disabled={disabled}
            aria-label="One fewer day"
          >
            −
          </button>
          <input
            id="trip-days"
            className="days-input"
            type="number"
            min={1}
            max={21}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            disabled={disabled}
          />
          <button
            type="button"
            className="days-btn"
            onClick={() => setDays((d) => Math.min(21, d + 1))}
            disabled={disabled}
            aria-label="One more day"
          >
            +
          </button>
        </div>
      </div>

      <div className="prompt-footer">
        <div className="prompt-examples">
          {EXAMPLES.map((ex) => (
            <button
              type="button"
              key={ex.text}
              className="example-chip"
              onClick={() => useExample(ex)}
              disabled={disabled}
            >
              {ex.days}d · {ex.text}
            </button>
          ))}
        </div>
        <button type="submit" className="prompt-submit" disabled={disabled || !value.trim()}>
          {disabled ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Planning…
            </>
          ) : (
            "Plan the trip"
          )}
        </button>
      </div>
    </form>
  );
}
