"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

import { PROJECTS } from "@/content/projects";
import { MEDIA } from "@/lib/motion/config";
import { gsap } from "@/lib/motion/register";

/**
 * The card that trails the cursor over the project list.
 *
 * It is not decoration. Until real screenshots exist it carries the project's
 * stack in mono — so hovering a row tells you what it was built with before
 * you commit to opening it. When a thumbnail is added in
 * `src/content/projects.ts` the image sits behind that.
 *
 * Never shown to a touch device or under reduced motion: there is no cursor to
 * follow in the first case, and the whole effect is gratuitous in the second.
 * The same information is in the list row either way.
 */
export function ProjectFollower({ activeId }: { activeId: string | null }) {
  const card = useRef<HTMLDivElement>(null);
  const project = PROJECTS.find((p) => p.id === activeId) ?? null;

  useEffect(() => {
    const el = card.current;
    if (!el) return;

    const allowed = window.matchMedia(
      `${MEDIA.anyMotion} and (hover: hover) and (pointer: fine)`,
    );
    if (!allowed.matches) return;

    // quickTo keeps one tween alive per property and just retargets it, which
    // is what produces the lag without allocating a tween per pointer event.
    const moveX = gsap.quickTo(el, "x", { duration: 0.55, ease: "power3" });
    const moveY = gsap.quickTo(el, "y", { duration: 0.55, ease: "power3" });
    const tilt = gsap.quickTo(el, "rotation", { duration: 0.7, ease: "power3" });

    let lastX = 0;
    let lastTime = 0;

    const onMove = (event: PointerEvent) => {
      const now = event.timeStamp;
      const dt = now - lastTime || 16;
      const velocity = (event.clientX - lastX) / dt;
      lastX = event.clientX;
      lastTime = now;

      moveX(event.clientX);
      moveY(event.clientY);
      // Lean into the direction of travel, capped so it never reads as a spin.
      tilt(gsap.utils.clamp(-10, 10, velocity * 6));
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const el = card.current;
    if (!el) return;
    gsap.to(el, {
      opacity: project ? 1 : 0,
      scale: project ? 1 : 0.92,
      duration: 0.3,
      ease: "power2.out",
      overwrite: "auto",
    });
  }, [project]);

  return (
    <div
      ref={card}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-40 hidden w-56 origin-top-left opacity-0 lg:block"
      style={{ willChange: "transform, opacity" }}
    >
      {/* Offset from the cursor itself so it never sits under the pointer. */}
      <div className="ml-6 -translate-y-1/2 border border-rule bg-raised">
        {project?.thumbnail ? (
          <Image
            src={project.thumbnail.src}
            alt=""
            width={project.thumbnail.width}
            height={project.thumbnail.height}
            sizes="224px"
            className="aspect-[4/3] w-full object-cover"
          />
        ) : null}

        <div className="p-3">
          <p className="label text-ink">{project?.title ?? ""}</p>
          {/* No stack on record for this one (see the FALTA list in
              src/content/projects.ts). The card carries the title alone rather
              than an apology for the missing half. */}
          {project && project.tech.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-0.5">
              {project.tech.map((tech) => (
                <li key={tech} className="label">
                  {tech}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
