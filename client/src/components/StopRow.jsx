import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const KIND_META = {
  place: { label: "Stop", cls: "kind-place", icon: "📍" },
  travel: { label: "Travel", cls: "kind-travel", icon: "→" },
  note: { label: "Note", cls: "kind-note", icon: "✦" },
};

export default function StopRow({ stop, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    "--stagger": index,
  };

  const meta = KIND_META[stop.kind] || KIND_META.place;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`stop-row ${meta.cls} ${isDragging ? "stop-row--dragging" : ""}`}
    >
      <div className="stop-timeline" aria-hidden="true">
        <span className="stop-node">{meta.icon}</span>
      </div>

      <div className="stop-card">
        <div className="stop-card-top">
          <span className="stop-time">{stop.time || "All day"}</span>
          <span className={`stop-kind-tag stop-kind-tag--${stop.kind}`}>{meta.label}</span>
        </div>

        <h3 className="stop-name">{stop.name}</h3>

        {stop.description && <p className="stop-description">{stop.description}</p>}

        <button
          type="button"
          className="stop-remove"
          onClick={() => onRemove(stop.id)}
          aria-label={`Remove ${stop.name}`}
        >
          Remove
        </button>

        <button
          type="button"
          className="drag-handle"
          aria-label={`Reorder ${stop.name}`}
          {...attributes}
          {...listeners}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </li>
  );
}
