import type { DeviceId } from "@fun/shared";
import { readJson, writeJson } from "@/storage/keys";

/** Bewusst ohne den Dev-Namensraum: die Basis-Kennung gehoert dem Browser. */
const DEVICE_KEY = "fa2:device";

/**
 * Die Kennung dieses Geraets. Sie entscheidet, welche Plaetze mir gehoeren, und
 * muss darum einen Reload ueberleben.
 *
 * `?device=b` haengt ein Suffix an – nur fuer die Entwicklung: zwei Tabs im
 * selben Browserprofil teilen sich sonst eine Kennung und streiten um denselben
 * Platz. Ohne diesen Handgriff laesst sich der Mehrgeraete-Modus lokal kaum
 * pruefen.
 */
export function deviceId(): DeviceId {
  const stored = readJson<DeviceId | null>(DEVICE_KEY, null);
  const base = stored ?? crypto.randomUUID();
  if (!stored) writeJson(DEVICE_KEY, base);

  const override = new URLSearchParams(location.search).get("device");
  return override ? `${base}#${override}` : base;
}
