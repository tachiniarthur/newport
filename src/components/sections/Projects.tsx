"use client";

import { useGSAP } from "@gsap/react";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";

import { SectionHead } from "@/components/primitives/SectionHead";
import type { Dictionary } from "@/content/dictionaries";
import { FEATURED_PROJECT, LISTED_PROJECTS, type Project } from "@/content/projects";
import { DURATION, EASE, MEDIA } from "@/lib/motion/config";
import { useLineReveal, useRevealOnScroll } from "@/lib/motion/hooks";
import { gsap } from "@/lib/motion/register";

import { ProjectFollower } from "./ProjectFollower";

/**
 * Asymmetric on purpose: one large featured project that breaks the grid to
 * the left, then everything else as a typographic list. Not a gallery of
 * equal cards.
 *
 * Opening a row expands it in place, and the whole list has to move as one
 * thing while it does. This was a Flip: the titles were captured before the
 * state change and tweened from their old positions to their new ones. The
 * trouble with that is what it does *not* capture — the rules between the
 * rows, the stack of rows below the one that opened, the detail block itself.
 * All of it jumped to the final layout on the first frame while the titles
 * slid over the top of it, which is two animations disagreeing about where the
 * list is rather than one list opening.
 *
 * So none of it is transformed. The row's detail panel is always in the DOM
 * and its height is what animates, which is a layout the browser reflows every
 * frame: everything below it — rules, rows, the rest of the page — is carried
 * by the same tween because it is genuinely being laid out around it. The
 * title's size goes with it, tweened as a font size for the same reason. It is
 * more work per frame than a transform and it is the only way the row and its
 * neighbours can be in the same place at the same time.
 *
 * Closing is the same animation backwards, which is why the panel stays
 * mounted: React unmounting it on close would collapse the space in one frame
 * no matter what was tweening.
 */
export function Projects({ dict }: { dict: Dictionary }) {
  const scope = useRef<HTMLElement>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useLineReveal(scope);
  useRevealOnScroll(scope);

  const toggle = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  return (
    <section ref={scope} id="projects" aria-labelledby="projects-title" className="section">
      <div className="shell">
        <SectionHead
          index={4}
          eyebrow={dict.projects.eyebrow}
          title={dict.projects.title}
          id="projects-title"
        />
      </div>

      <Featured project={FEATURED_PROJECT} dict={dict} />

      <div className="shell">
        <ul
          className="mt-24 border-t border-rule lg:mt-36"
          onPointerLeave={() => setHoveredId(null)}
        >
          {LISTED_PROJECTS.map((project) => (
            <ProjectRow
              key={project.id}
              project={project}
              dict={dict}
              isOpen={openId === project.id}
              onToggle={toggle}
              onHover={setHoveredId}
            />
          ))}
        </ul>
      </div>

      <ProjectFollower activeId={openId ? null : hoveredId} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * The featured project ignores the centred measure every other block obeys and
 * runs the full width of the viewport — the one place the grid opens up.
 *
 * The panel is the frame around the project, not around a picture of it. There
 * were real screenshots in the plan and there are none yet (see the FALTA list
 * in src/content/projects.ts), and a labelled 16:7 hole where one should be
 * does not read as "image pending" — it reads as a section that failed to
 * load. The thumbnail slots in above this block the day one exists.
 */
function Featured({ project, dict }: { project: Project; dict: Dictionary }) {
  const copy = dict.projects.items[project.id as keyof typeof dict.projects.items];

  return (
    <article className="mt-16 border-y border-rule bg-raised lg:mt-24">
      {project.thumbnail ? (
        <Image
          src={project.thumbnail.src}
          alt={project.title}
          width={project.thumbnail.width}
          height={project.thumbnail.height}
          sizes="100vw"
          className="aspect-[16/7] w-full border-b border-rule object-cover"
        />
      ) : null}

      <div className="shell">
        <div className="grid-editorial py-16 lg:py-24">
          <p className="label col-span-4 self-start text-accent lg:col-span-2">
            {dict.projects.featuredLabel}
          </p>

          <div className="col-span-4 lg:col-span-6 lg:col-start-3">
            <h3 className="font-display text-display-l text-ink" data-reveal>
              {project.title}
            </h3>
            <p className="measure mt-6 font-body text-body-l" data-reveal>
              {copy.description}
            </p>
            <ProjectLinks project={project} dict={dict} />
          </div>

          <dl className="col-span-4 flex flex-col gap-6 lg:col-span-3 lg:col-start-10">
            <Meta label={dict.projects.roleLabel} value={copy.role} />
            {/* FALTA: ano. Um traço em cada projeto é ruído — a linha inteira
                não aparece enquanto o dado não existir. */}
            {project.year ? (
              <Meta label={dict.projects.yearLabel} value={String(project.year)} />
            ) : null}
            <Meta label={dict.projects.techLabel} value={project.tech.join(" · ")} />
          </dl>
        </div>
      </div>
    </article>
  );
}

function ProjectRow({
  project,
  dict,
  isOpen,
  onToggle,
  onHover,
}: {
  project: Project;
  dict: Dictionary;
  isOpen: boolean;
  onToggle: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  const copy = dict.projects.items[project.id as keyof typeof dict.projects.items];
  const detailId = `project-detail-${project.id}`;

  const panel = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLSpanElement>(null);
  /** The title's own size at rest, so a tween has somewhere to come from: by
   *  the time this runs React has already swapped the class. */
  const size = useRef("");
  const settled = useRef(false);

  useGSAP(
    () => {
      const panelEl = panel.current;
      const titleEl = title.current;
      if (!panelEl || !titleEl) return;

      const body = panelEl.firstElementChild;

      // Whatever the title looks like right now, which is a px value mid-tween
      // and nothing at all at rest. Cleared before the target is read, so the
      // target is the class's size rather than the frame the last tween had
      // got to — that is what lets a second click land while the first is
      // still running and simply carry on from where it is.
      const inline = titleEl.style.fontSize;
      if (inline) gsap.set(titleEl, { clearProps: "fontSize" });
      const target = getComputedStyle(titleEl).fontSize;
      const from = inline || size.current;
      size.current = target;

      if (!settled.current || window.matchMedia(MEDIA.motionReduced).matches) {
        settled.current = true;
        gsap.set(panelEl, { height: isOpen ? "auto" : 0 });
        if (body) gsap.set(body, { opacity: isOpen ? 1 : 0 });
        return;
      }

      gsap.to(panelEl, {
        height: isOpen ? "auto" : 0,
        duration: DURATION.deliberate,
        ease: EASE.inOut,
        overwrite: true,
      });

      if (body) {
        gsap.to(body, {
          opacity: isOpen ? 1 : 0,
          // Reads on the way in and is gone before the space closes on the way
          // out, so neither direction ends on a paragraph fading into a gap.
          duration: isOpen ? DURATION.reveal : DURATION.micro,
          ease: EASE.out,
          overwrite: true,
        });
      }

      if (from && from !== target) {
        gsap.fromTo(
          titleEl,
          { fontSize: from },
          {
            fontSize: target,
            duration: DURATION.deliberate,
            ease: EASE.inOut,
            // Back to the class the moment it lands, so a resize or a
            // breakpoint is not overruled by a px value we left behind.
            clearProps: "fontSize",
            overwrite: true,
          },
        );
      }
    },
    { dependencies: [isOpen] },
  );

  return (
    <li className="border-b border-rule" onPointerEnter={() => onHover(project.id)}>
      {/* Three things per row and no more: what it is called, what it was
          built with, and whether it is open. The year and the role used to sit
          between them, both of them an em dash on every single row — four
          columns of which two carried nothing. */}
      <button
        type="button"
        onClick={() => onToggle(project.id)}
        aria-expanded={isOpen}
        aria-controls={detailId}
        className="grid-editorial w-full items-baseline py-8 text-left lg:py-10"
      >
        <span
          ref={title}
          className={`col-span-3 font-display text-ink transition-colors duration-200 lg:col-span-6 ${
            isOpen ? "text-display-l" : "text-display-m"
          }`}
        >
          {project.title}
        </span>

        {project.tech.length > 0 ? (
          <span className="label col-span-4 lg:col-span-4 lg:col-start-8">
            {project.tech.join(" · ")}
          </span>
        ) : null}

        <span
          aria-hidden="true"
          className="label col-span-1 col-start-4 text-right text-accent lg:col-span-1 lg:col-start-12"
        >
          {isOpen ? "−" : "+"}
        </span>
      </button>

      {/* Always mounted, and closed by height rather than by React — see the
          note at the top of this file. `inert` is what keeps a collapsed panel
          out of the tab order and out of the accessibility tree, which is the
          job the unmount used to be doing.

          Aligned to the title's own column, so opening a row does not shift
          the text sideways as well. */}
      <div
        ref={panel}
        id={detailId}
        inert={!isOpen}
        className="overflow-hidden"
        style={{ height: 0 }}
      >
        <div className="grid-editorial pb-12">
          <div className="col-span-4 lg:col-span-6">
            <p className="measure font-body text-body-l">{copy.description}</p>
            <ProjectLinks project={project} dict={dict} />
          </div>

          <dl className="col-span-4 flex flex-col gap-6 lg:col-span-3 lg:col-start-10">
            <Meta label={dict.projects.roleLabel} value={copy.role} />
          </dl>
        </div>
      </div>
    </li>
  );
}

function ProjectLinks({ project, dict }: { project: Project; dict: Dictionary }) {
  if (project.links.length === 0) {
    // FALTA: link de repositório ou demonstração para este projeto.
    return null;
  }

  return (
    <ul className="mt-8 flex flex-wrap gap-x-8 gap-y-3">
      {project.links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer noopener"
            className="label text-ink underline decoration-rule underline-offset-4 transition-colors duration-200 hover:text-accent hover:decoration-accent"
          >
            {link.kind === "repo" ? dict.projects.repo : dict.projects.demo}
            {link.label ? <span className="text-muted"> {link.label}</span> : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div data-reveal>
      <dt className="label">{label}</dt>
      <dd className="label mt-1 text-ink">{value}</dd>
    </div>
  );
}
