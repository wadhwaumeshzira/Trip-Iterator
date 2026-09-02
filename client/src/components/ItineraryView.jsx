import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import StopRow from "./StopRow";

export default function ItineraryView({ itinerary, onChange }) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const activeDay = itinerary.days[activeDayIndex];

  function updateDay(dayIndex, nextStops) {
    const nextDays = itinerary.days.map((day, i) =>
      i === dayIndex ? { ...day, stops: nextStops } : day
    );
    onChange({ ...itinerary, days: nextDays });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const stops = activeDay.stops;
    const oldIndex = stops.findIndex((s) => s.id === active.id);
    const newIndex = stops.findIndex((s) => s.id === over.id);
    updateDay(activeDayIndex, arrayMove(stops, oldIndex, newIndex));
  }

  function handleRemove(stopId) {
    const remaining = activeDay.stops.filter((s) => s.id !== stopId);
    updateDay(activeDayIndex, remaining);
  }

  return (
    <div className="itinerary">
      <header className="itinerary-header">
        <h1 className="itinerary-title">{itinerary.tripTitle}</h1>
        {itinerary.summary && <p className="itinerary-summary">{itinerary.summary}</p>}
      </header>

      <div className="day-tabs" role="tablist">
        {itinerary.days.map((day, i) => (
          <button
            key={day.id}
            role="tab"
            aria-selected={i === activeDayIndex}
            className={`day-tab ${i === activeDayIndex ? "day-tab--active" : ""}`}
            onClick={() => setActiveDayIndex(i)}
          >
            {day.title}
          </button>
        ))}
      </div>

      {activeDay.stops.length === 0 ? (
        <p className="day-empty">Every stop on this day has been removed.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={activeDay.stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <ul className="stop-list">
              {activeDay.stops.map((stop, i) => (
                <StopRow key={stop.id} stop={stop} index={i} onRemove={handleRemove} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
