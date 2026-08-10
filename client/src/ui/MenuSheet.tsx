import { Link } from "react-router-dom";
import type { MenuItem } from "@/game/types";
import { ColorModeToggle } from "./ColorModeToggle";
import { Sheet } from "./Sheet";

export function MenuSheet({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: readonly MenuItem[];
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Menü">
      <div className="flex flex-col gap-1">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={item.disabled}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={`btn btn-ghost h-auto min-h-0 justify-start px-3 py-3 text-base font-normal ${
              item.danger ? "text-error" : ""
            }`}
          >
            {item.label}
          </button>
        ))}

        <div className="divider my-1" />

        <div className="flex items-center justify-between gap-3 px-3 py-1">
          <span className="text-sm">Darstellung</span>
          <ColorModeToggle />
        </div>

        <Link
          to="/"
          className="btn btn-ghost h-auto min-h-0 justify-start px-3 py-3 text-base font-normal"
          onClick={onClose}
        >
          ← Alle Apps
        </Link>
      </div>
    </Sheet>
  );
}
