import type { ReactNode } from "react";

/**
 * Every section opens the same way: a numbered mono eyebrow over a display
 * heading, with a hairline above. The repetition is the point — it is the
 * quiet frame that lets the grid breaks stand out.
 */
export function SectionHead({
  index,
  eyebrow,
  title,
  id,
  aside,
}: {
  index: number;
  eyebrow: string;
  title: string;
  id: string;
  aside?: ReactNode;
}) {
  return (
    <header>
      <hr className="hairline" />
      <div className="grid-editorial pt-4">
        <p className="label col-span-4 flex items-baseline gap-3 lg:col-span-2">
          <span className="text-ink tabular-nums">{String(index).padStart(2, "0")}</span>
          <span>{eyebrow}</span>
        </p>
        {aside ? <div className="col-span-4 lg:col-span-4 lg:col-start-9">{aside}</div> : null}
      </div>
      <h2
        id={id}
        data-split
        className="mt-12 max-w-[18ch] font-display text-display-l text-ink opacity-0"
      >
        {title}
      </h2>
    </header>
  );
}
