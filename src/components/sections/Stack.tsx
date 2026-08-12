"use client";

import { animate } from "animejs";
import { useCallback, useEffect, useRef, useState } from "react";

import { SectionHead } from "@/components/primitives/SectionHead";
import { TechIcon } from "@/components/primitives/TechIcon";
import type { Dictionary } from "@/content/dictionaries";
import { EMPLOYER, STACK, type StackItem } from "@/content/stack";
import { DURATION } from "@/lib/motion/config";
import { useLineReveal, useRevealEach } from "@/lib/motion/hooks";
import { useMediaQuery } from "@/lib/useMediaQuery";

/**
 * The old portfolio's symmetrical grid of technology logos, replaced with a
 * typographic list that says something a logo cannot: where each technology
 * was actually used.
 *
 * Rows whose `where` is null render without a note rather than with an
 * invented one.
 *
 * ENGINE BOUNDARY — this is the one section where anime.js is used, and the
 * split is strict: GSAP reveals the group containers (`[data-reveal]` on the
 * heading and the <ul>), anime.js owns opacity on the <li> rows and their
 * notes. No node is ever animated by both.
 */
export function Stack({ dict }: { dict: Dictionary }) {
  const scope = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  /**
   * Whether a note can be shown *beside* its row, which is the only question
   * this section has to answer — and it is a question about room, not about
   * pointers.
   *
   * It used to ask only about the pointer, and that left a hole every narrow
   * window fell into: the note beside the row is `lg:block`, so under 1024px it
   * is never painted, while a window reporting a mouse took the hover branch
   * anyway. The rows dimmed around the one being pointed at and the thing the
   * dimming was pointing at did not exist. Nothing said where anything was
   * used — which is the one thing this section is for.
   *
   * So the width is asked first and the pointer second: there has to be a
   * column to put the note in, *and* something that can hover to reveal it.
   * Anything else — a phone, a narrow window, a tablet, a desktop dragged
   * small — opens the note under the row instead. `false` is the server's
   * answer and it is the safe one: that branch works with any input there is.
   */
  const inlineNotes = useMediaQuery("(min-width: 1024px) and (hover: hover) and (pointer: fine)");

  useLineReveal(scope);
  useRevealEach(scope, "[data-reveal]");
  useDimming(scope, activeId);

  const clear = useCallback(() => {
    if (inlineNotes) setActiveId(null);
  }, [inlineNotes]);

  return (
    <section
      ref={scope}
      id="stack"
      aria-labelledby="stack-title"
      className="shell section"
      onPointerLeave={clear}
    >
      <SectionHead
        index={2}
        eyebrow={dict.stack.eyebrow}
        title={dict.stack.title}
        id="stack-title"
        aside={
          <p className="label" data-reveal>
            {inlineNotes ? dict.stack.hint : dict.stack.hintTouch}
          </p>
        }
      />

      <div className="flex flex-col gap-16 pt-16 lg:gap-24 lg:pt-24">
        {STACK.map((group, index) => {
          /* Every other group is mirrored, so the section reads as a rhythm
             rather than as one long left edge. The DOM order never changes:
             the heading is still written before the list it heads, and only
             the grid placement moves. */
          const mirrored = index % 2 === 1;

          return (
            <div key={group.id} className="grid-editorial">
              <h3
                className={`label col-span-4 lg:col-span-2 ${
                  mirrored ? "text-right lg:col-start-11" : ""
                }`}
                data-reveal
              >
                {dict.stack.groups[group.id]}
              </h3>

              {/* Columns 1-2 heading, 3-11 list, 12 open. Mirrored, that is
                  1 open, 2-10 list, 11-12 heading: the same shape reflected,
                  so neither side is wider than the other. */}
              <ul
                data-reveal
                className={`col-span-4 lg:col-span-9 ${
                  mirrored ? "lg:col-start-2" : "lg:col-start-3"
                }`}
              >
                {group.items.map((item) => (
                  <StackRow
                    key={item.name}
                    item={item}
                    note={formatWhere(item.where, dict.stack.places)}
                    isActive={activeId === item.name}
                    inlineNotes={inlineNotes}
                    mirrored={mirrored}
                    onActivate={setActiveId}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * The note read out of `where`. The two employers are proper nouns and are
 * written as they are; "personal" is prose and comes from the dictionary.
 * Joined here rather than in the data file so the separator stays a rendering
 * decision.
 */
function formatWhere(
  where: StackItem["where"],
  places: Dictionary["stack"]["places"],
): string | null {
  if (where === null) return null;
  return where
    .map((place) => (place === "personal" ? places.personal : EMPLOYER[place]))
    .join(" · ");
}

function StackRow({
  item,
  note,
  isActive,
  inlineNotes,
  mirrored,
  onActivate,
}: {
  item: StackItem;
  note: string | null;
  isActive: boolean;
  inlineNotes: boolean;
  /** Reflected group: the row is read from the right edge inwards. */
  mirrored: boolean;
  onActivate: (id: string | null) => void;
}) {
  const hasNote = note !== null;

  /* `justify-between` still does the work; reversing the direction is what
     swaps which end each child lands on, and it costs nothing in the DOM. */
  const row = `flex items-center justify-between gap-6 py-3 ${
    mirrored ? "flex-row-reverse" : ""
  }`;

  const open = useCallback(() => onActivate(item.name), [item.name, onActivate]);
  const toggle = useCallback(
    () => onActivate(isActive ? null : item.name),
    [isActive, item.name, onActivate],
  );

  return (
    <li
      data-stack-row={item.name}
      className="border-b border-rule last:border-b-0"
      onPointerEnter={() => inlineNotes && hasNote && open()}
    >
      {hasNote ? (
        /* A row with a note is a real control: it is reachable by keyboard and
           it reports its state.

           Which event opens it is not a detail. With the note beside the row,
           hovering opens it and focus is the keyboard's version of hovering.
           With the note under the row, `onFocus` cannot be the opener as well:
           a tap focuses the button and then clicks it, so the focus opens the
           row and the click that follows closes it again — a row that does not
           open at all, on exactly the devices that have no other way in. There
           the click is the only opener, and a keyboard gets it for free,
           because Enter and Space on a button are clicks. */
        <button
          type="button"
          onClick={inlineNotes ? undefined : toggle}
          onFocus={inlineNotes ? open : undefined}
          aria-expanded={inlineNotes ? undefined : isActive}
          className={`${row} w-full ${mirrored ? "text-right" : "text-left"}`}
        >
          <RowTitle item={item} mirrored={mirrored} />
          {inlineNotes ? (
            <span
              data-stack-note
              className={`label hidden shrink-0 text-ink opacity-0 lg:block ${
                mirrored ? "text-left" : "text-right"
              }`}
            >
              {note}
            </span>
          ) : (
            <span aria-hidden="true" className="label shrink-0">
              {isActive ? "−" : "+"}
            </span>
          )}
        </button>
      ) : (
        <div className={row}>
          <RowTitle item={item} mirrored={mirrored} />
        </div>
      )}

      {/* No column for it: the note opens below the row rather than beside it. */}
      {hasNote && !inlineNotes && isActive ? (
        <p className={`label pb-3 text-ink ${mirrored ? "text-right" : ""}`}>{note}</p>
      ) : null}
    </li>
  );
}

/**
 * The mark and the name, on one line.
 *
 * The row is `items-center` rather than `items-baseline` — a flex box takes its
 * baseline from its first item, and an SVG has none to give, so a mark in front
 * of the name would drag the whole row's alignment to the bottom of the icon
 * and leave the note on the right hanging off it.
 *
 * In a mirrored group the pair reverses too, so the mark stays on the outside
 * and the names keep a straight edge to be read down. Leaving it alone would
 * put the icons in the middle of the row, between the name and the note, which
 * is the one place a mark says nothing.
 */
function RowTitle({ item, mirrored }: { item: StackItem; mirrored: boolean }) {
  return (
    <span
      className={`flex min-w-0 items-center gap-4 font-display text-display-m text-ink ${
        mirrored ? "flex-row-reverse" : ""
      }`}
    >
      <TechIcon name={item.icon} />
      <span className="truncate">{item.name}</span>
    </span>
  );
}

/**
 * Everything recedes except the row being read, and its note fades in beside
 * it. Opacity only. Every animation is reverted on unmount so instances do not
 * leak across a language navigation.
 */
function useDimming(scope: React.RefObject<HTMLElement | null>, activeId: string | null) {
  useEffect(() => {
    const root = scope.current;
    if (!root) return;

    const rows = Array.from(root.querySelectorAll<HTMLElement>("[data-stack-row]"));
    if (rows.length === 0) return;

    const running = rows.flatMap((row) => {
      const isActive = activeId !== null && row.dataset.stackRow === activeId;
      const note = row.querySelector<HTMLElement>("[data-stack-note]");

      const animations = [
        animate(row, {
          opacity: activeId === null || isActive ? 1 : 0.25,
          duration: DURATION.micro * 1000,
          ease: "outQuad",
        }),
      ];

      if (note) {
        animations.push(
          animate(note, {
            opacity: isActive ? 1 : 0,
            duration: DURATION.micro * 1000,
            ease: "outQuad",
          }),
        );
      }

      return animations;
    });

    return () => running.forEach((animation) => animation.pause());
  }, [scope, activeId]);
}
