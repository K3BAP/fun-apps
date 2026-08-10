import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Player, PlayerId } from "@/game/players";

function Row({
  player,
  position,
  onRemove,
}: {
  player: Player;
  position: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        borderInlineStartColor: player.color,
      }}
      className={`bg-base-100 border-base-300 flex items-center gap-3 rounded-lg border border-s-4 px-2 py-2 ${
        isDragging ? "z-10 opacity-80 shadow-lg" : ""
      }`}
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm px-2 text-lg leading-none"
        aria-label={`${player.name} verschieben`}
        {...attributes}
        {...listeners}
      >
        ≡
      </button>
      <span
        className="grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: player.color }}
        aria-hidden="true"
      >
        {position}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{player.name}</span>
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-circle"
        onClick={onRemove}
        aria-label={`${player.name} entfernen`}
      >
        ✕
      </button>
    </li>
  );
}

/**
 * Die einzige sortierbare Liste im Projekt – deshalb direkt gegen dnd-kit
 * gebaut und nicht noch einmal weggekapselt. Gezogen wird am Griff ≡, per
 * Tastatur geht es ebenfalls (Leertaste, dann Pfeiltasten).
 */
export function SortablePlayerList({
  players,
  onReorder,
  onRemove,
}: {
  players: readonly Player[];
  onReorder: (ids: PlayerId[]) => void;
  onRemove: (id: PlayerId) => void;
}) {
  const sensors = useSensors(
    // Ohne Mindestdistanz wuerde jeder Tipp auf den Griff schon als Ziehen gelten.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = players.map((p) => p.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={players.map((p) => p.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-2">
          {players.map((player, index) => (
            <Row
              key={player.id}
              player={player}
              position={index + 1}
              onRemove={() => onRemove(player.id)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
