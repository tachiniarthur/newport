"use client";

import { useRef } from "react";

import { SectionHead } from "@/components/primitives/SectionHead";
import type { Dictionary } from "@/content/dictionaries";
import { TIMELINE, formatSpan, type Milestone, type Role } from "@/content/timeline";
import { useLineReveal, useRevealEach, useRevealOnScroll } from "@/lib/motion/hooks";

/**
 * The career, in document order, hung off a single spine.
 *
 * It was a pinned horizontal track. It is not any more: the reveal of each
 * card was measured along that track's own animation, and an entry that failed
 * to be triggered stayed at opacity 0 — which is how an entire section of a
 * portfolio ends up reading as blank. What is here now is a plain vertical
 * list. The rule down the left is a continuous border rather than a positioned
 * element, so it cannot come apart from the entries it belongs to, and the
 * reveal is one trigger per entry against the page itself.
 */
export function Trajectory({ dict }: { dict: Dictionary }) {
  const scope = useRef<HTMLElement>(null);

  useLineReveal(scope);
  // Covers the [data-reveal] elements in the section head — the lane legend in
  // particular. The entries are not [data-reveal]; they have their own
  // triggers, so they arrive as the reader reaches them rather than all at
  // once when the section does.
  useRevealOnScroll(scope);
  useRevealEach(scope, "[data-milestone]");

  return (
    <section ref={scope} id="timeline" aria-labelledby="timeline-title" className="shell section">
      <SectionHead
        index={3}
        eyebrow={dict.timeline.eyebrow}
        title={dict.timeline.title}
        id="timeline-title"
        aside={<LaneLegend dict={dict} />}
      />

      <ol className="mt-16 lg:mt-24">
        {TIMELINE.map((milestone, index) => (
          <MilestoneRow
            key={milestone.id}
            milestone={milestone}
            dict={dict}
            last={index === TIMELINE.length - 1}
          />
        ))}
      </ol>
    </section>
  );
}

/**
 * Names the two tracks once, at the top, so each entry can label itself with a
 * single word without the reader having to guess the set.
 */
function LaneLegend({ dict }: { dict: Dictionary }) {
  return (
    <ul className="flex gap-6" data-reveal>
      {(
        [
          ["education", dict.timeline.trackLabels.education],
          ["work", dict.timeline.trackLabels.work],
        ] as const
      ).map(([id, label]) => (
        <li key={id} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`block h-4 w-px ${id === "work" ? "bg-accent" : "bg-ink"}`}
          />
          <span className="label">{label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * One place, and everything Arthur was there to do.
 *
 * The margin carries the place's own span — first year in to last year out —
 * and the article carries the posts. Where there was only ever one post, its
 * title sits straight under the organisation and takes the span from the
 * margin; where there was more than one, each carries its own dates, because
 * the promotion inside FACE Digital is a fact about the entry and printing one
 * span across both would hide it.
 */
function MilestoneRow({
  milestone,
  dict,
  last,
}: {
  milestone: Milestone;
  dict: Dictionary;
  last: boolean;
}) {
  const isWork = milestone.track === "work";
  const single = milestone.roles.length === 1;

  return (
    <li data-milestone className="grid-editorial">
      <p className="label col-span-4 flex items-baseline gap-3 lg:col-span-2 lg:flex-col lg:items-start lg:gap-2">
        <span className="text-ink tabular-nums whitespace-nowrap">
          {formatSpan(milestone.startYear, milestone.endYear, dict.timeline.present)}
        </span>
        <span className={isWork ? "text-accent" : undefined}>
          {dict.timeline.trackLabels[milestone.track]}
        </span>
      </p>

      {/* The spine is this element's own left border, and the gap to the next
          entry is its padding — so the rule runs through the gap instead of
          restarting at every entry. */}
      <article
        className={`relative col-span-4 lg:col-span-9 lg:col-start-3 lg:border-l lg:border-rule lg:pl-12 ${
          last ? "pb-0" : "pb-16 lg:pb-24"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-[0.6rem] left-0 hidden h-2 w-2 -translate-x-1/2 rounded-full lg:block ${
            isWork ? "bg-accent" : "bg-ink"
          }`}
        />

        <h3 className="font-display text-display-m text-ink">{milestone.organization}</h3>

        {/* Tight under the heading when there is one post — the two read as a
            single label. Loose, and separated, when there are several, so the
            posts are a list rather than a paragraph that changed subject. */}
        <ol className={single ? "mt-2" : "mt-8 flex flex-col gap-12"}>
          {milestone.roles.map((role) => (
            <RoleBlock key={role.id} role={role} dict={dict} bare={single} />
          ))}
        </ol>
      </article>
    </li>
  );
}

function RoleBlock({
  role,
  dict,
  bare,
}: {
  role: Role;
  dict: Dictionary;
  /** The only post there was: no dates of its own, and the title belongs to
   *  the organisation above it rather than opening a block. */
  bare: boolean;
}) {
  const copy = dict.timeline.items[role.id as keyof typeof dict.timeline.items];

  return (
    <li>
      {bare ? (
        <p className="label">{copy.role}</p>
      ) : (
        <p className="label flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-ink tabular-nums whitespace-nowrap">
            {formatSpan(role.startYear, role.endYear, dict.timeline.present)}
          </span>
          <span aria-hidden="true" className="text-rule">
            ·
          </span>
          <span>{copy.role}</span>
        </p>
      )}

      <p className="measure mt-6 font-body text-body-m">{copy.summary}</p>

      {role.tech.length > 0 && (
        <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          {role.tech.map((tech) => (
            <li key={tech} className="label">
              {tech}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
