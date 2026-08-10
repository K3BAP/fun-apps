import { Link } from "react-router-dom";
import type { MenuItem } from "@/game/types";
import { ColorModeToggle } from "./ColorModeToggle";
import { Sheet } from "./Sheet";
import { ArrowLeftIcon, CheckIcon } from "./icons";

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
            key={item.id}
            type="button"
            disabled={item.disabled}
            aria-pressed={item.checked === undefined ? undefined : item.checked}
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className={`btn btn-ghost h-auto min-h-0 justify-start gap-3 px-3 py-3 text-base font-normal ${
              item.danger ? "text-error" : ""
            }`}
          >
            {/* Feste Spalte fuer das Symbol, damit alle Beschriftungen fluchten –
                auch die Eintraege ohne Symbol und die abgewaehlten Schalter. */}
            <span className="grid w-5 shrink-0 place-items-center">
              {item.checked === undefined ? (
                item.icon
              ) : item.checked ? (
                <CheckIcon className="text-primary size-5" />
              ) : null}
            </span>
            <span>{item.label}</span>
            {item.note && <span className="text-base-content/50 -ms-1 text-sm">· {item.note}</span>}
          </button>
        ))}

        <div className="divider my-1" />

        <div className="flex items-center justify-between gap-3 px-3 py-1">
          <span className="text-sm">Darstellung</span>
          <ColorModeToggle />
        </div>

        <Link
          to="/"
          className="btn btn-ghost h-auto min-h-0 justify-start gap-3 px-3 py-3 text-base font-normal"
          onClick={onClose}
        >
          <ArrowLeftIcon />
          Alle Apps
        </Link>
      </div>
    </Sheet>
  );
}
