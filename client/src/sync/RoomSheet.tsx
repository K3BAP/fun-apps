import { Sheet } from "@/ui/Sheet";
import { RoomPanel } from "./RoomPanel";

/**
 * Der Raum waehrend des Spiels: Code zum Nachreichen, wer verbunden ist, und
 * der Ausgang.
 *
 * Eroeffnet und beigetreten wird hier nicht mehr – das passiert vor dem Spiel
 * im Online-Einstieg, wo es hingehoert. Dieses Blatt beantwortet nur noch die
 * Fragen, die *waehrend* einer Partie aufkommen.
 */
export function RoomSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Raum">
      <RoomPanel onLeave={onClose} />
    </Sheet>
  );
}
