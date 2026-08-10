/**
 * Die paar Symbole, die keine Emojis sind.
 *
 * Vorher standen hier Textzeichen (− + ← → ⋯ ✕ ≡). Deren Groesse und optische
 * Mitte haengen an der Systemschrift, weshalb sie je nach Geraet verrutschten
 * und unterschiedlich fett wirkten. Als SVG sind sie ueberall gleich, folgen
 * `currentColor` und sitzen in einer einheitlichen Box.
 *
 * Emojis bleiben Emojis: 🎲 🧙 🥬 🌈 👑 🔒 sind Inhalt, keine Bedienzeichen.
 */
import type { ReactNode } from "react";

type IconProps = { className?: string };

function Icon({ className = "size-5", children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </Icon>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

/** Das ⋯-Menue. */
export function MoreIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </Icon>
  );
}

/** Der Griff zum Umsortieren. */
export function DragHandleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9h16M4 15h16" />
    </Icon>
  );
}

export function UndoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10H9" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 13 4 4L19 7" />
    </Icon>
  );
}

/** Zwei Geraete, die dasselbe Spiel zeigen – der Online-Modus. */
export function DevicesIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="4" width="12" height="9" rx="1.5" />
      <path d="M5 17h6" />
      <rect x="16" y="9" width="6" height="11" rx="1.5" />
    </Icon>
  );
}
