import type { ReactNode } from "react";

export function ResultHeader({
  emoji = "🏆",
  title,
  subtitle,
}: {
  emoji?: string;
  title: string;
  subtitle: ReactNode;
}) {
  return (
    <header className="flex flex-col items-center gap-2 pt-6 pb-2 text-center">
      <div className="text-5xl" aria-hidden="true">
        {emoji}
      </div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="text-base-content/70 max-w-sm text-balance">{subtitle}</p>
    </header>
  );
}
