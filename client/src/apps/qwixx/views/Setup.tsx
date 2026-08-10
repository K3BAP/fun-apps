import { useState } from "react";
import { NAME_MAX_LENGTH } from "@/game/players";
import { Container } from "@/ui/Container";
import { GameHero } from "@/ui/GameHero";
import { PlayerSetup } from "@/ui/PlayerSetup";
import { Toggle } from "@/ui/Toggle";
import manifest from "../manifest";
import { VARIANTS, variantInfo } from "../rules";
import { useQwixx } from "../state";
import { t } from "../strings";
import { SegmentedControl } from "@/ui/SegmentedControl";

function Options() {
  const { store } = useQwixx();
  const { showScore, requireEnd } = store.state;

  return (
    <div className="flex flex-col">
      <Toggle
        title={t.optShowScore}
        description={t.optShowScoreHint}
        checked={showScore}
        onChange={(on) => store.dispatch({ type: "setShowScore", on })}
      />
      <Toggle
        title={t.optRequireEnd}
        description={t.optRequireEndHint}
        checked={requireEnd}
        onChange={(on) => store.dispatch({ type: "setRequireEnd", on })}
      />
    </div>
  );
}

function SoloSetup() {
  const { store } = useQwixx();
  const [name, setName] = useState(store.state.players[0]?.name ?? "");

  return (
    <>
      <section className="card card-border bg-base-200 border-base-300">
        <div className="card-body gap-3 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">{t.yourName}</span>
            <input
              type="text"
              className="input w-full"
              placeholder={t.yourNamePlaceholder}
              maxLength={NAME_MAX_LENGTH}
              autoComplete="off"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") store.dispatch({ type: "startSolo", name });
              }}
            />
          </label>
          <p className="text-base-content/60 text-sm">{t.soloHint}</p>
          <Options />
        </div>
      </section>

      <button
        type="button"
        className="btn btn-primary btn-lg"
        onClick={() => store.dispatch({ type: "startSolo", name })}
      >
        {t.startSolo}
      </button>
    </>
  );
}

function SharedSetup() {
  const { store } = useQwixx();
  const { players } = store.state;
  const { min, max } = manifest.players;

  return (
    <>
      <section className="card card-border bg-base-200 border-base-300">
        <div className="card-body gap-3 p-4">
          <PlayerSetup
            players={players}
            min={min}
            max={max}
            onAdd={(name) => store.dispatch({ type: "addPlayer", name })}
            onRemove={(id) => store.dispatch({ type: "removePlayer", id })}
            onReorder={(ids) => store.dispatch({ type: "reorderPlayers", ids })}
          />
          <Options />
        </div>
      </section>

      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={players.length < min}
        onClick={() => store.dispatch({ type: "startShared" })}
      >
        {t.startShared}
      </button>
    </>
  );
}

export function Setup() {
  const { store } = useQwixx();
  const { mode, variant } = store.state;
  const solo = mode === "solo";

  return (
    <Container size="form" className="flex flex-col gap-5 px-4 pb-8 safe-bottom">
      <GameHero tagline={t.tagline} />

      <div className="flex flex-col gap-1">
        <span className="text-base-content/60 text-xs">{t.modeLabel}</span>
        <SegmentedControl
          label={t.modeLabel}
          value={mode}
          onChange={(next) => store.dispatch({ type: "setMode", mode: next })}
          options={[
            { key: "shared", label: t.modeShared, hint: t.modeSharedHint },
            { key: "solo", label: t.modeSolo, hint: t.modeSoloHint },
          ]}
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-base-content/60 text-xs">{t.blockLabel}</span>
        <SegmentedControl
          label={t.blockLabel}
          value={variant}
          onChange={(next) => store.dispatch({ type: "setVariant", variant: next })}
          options={VARIANTS.map((option) => ({
            key: option.key,
            label: option.title,
            hint: option.sub,
          }))}
        />
        <p className="text-base-content/60 text-sm">
          {variantInfo(variant).hint}
          {solo && t.soloAllSame}
        </p>
      </div>

      {solo ? <SoloSetup /> : <SharedSetup />}
    </Container>
  );
}
