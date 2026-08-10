import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

/**
 * Bottom-Sheet auf Basis von <dialog>.
 *
 * Der Browser bringt Scrim, Escape-zum-Schliessen und Fokusfalle selbst mit –
 * das ersetzt den handgeschriebenen scrim/openSheet/closeSheet-Block der
 * bisherigen Apps. Das <dialog> bleibt im DOM unterhalb des Theme-Wrappers,
 * damit die daisyUI-Variablen von dort aufgeloest werden.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Fuer Inhalte mit einer Spalte je Spieler: auf grossen Displays breiter. */
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="modal modal-bottom sm:modal-middle"
      onClose={onClose}
      onClick={(event) => {
        // Klick daneben (also auf das <dialog> selbst, nicht auf die Box).
        if (event.target === ref.current) onClose();
      }}
    >
      <div
        className={`modal-box border-base-300 max-h-[85dvh] border-t sm:border ${
          wide ? "sm:max-w-3xl" : ""
        }`}
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description && <div className="text-base-content/60 mt-1 text-sm">{description}</div>}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            aria-label="Schließen"
          >
            <CloseIcon className="size-4" />
          </button>
        </div>

        <div className="-mx-1 max-h-[60dvh] overflow-y-auto px-1">{children}</div>

        {footer && <div className="modal-action mt-4">{footer}</div>}
      </div>
    </dialog>
  );
}
