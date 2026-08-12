"use client";

import Image from "next/image";
import { useEffect, useImperativeHandle, useRef, type RefObject } from "react";

import { PORTRAIT, PORTRAIT_SAMPLE } from "@/content/media";
import { createWireEngine, type WireEngine } from "@/lib/motion/wireEngine";

export type HeroPortraitHandle = {
  /** Renders the transformation at scrub progress 0-1, and `exit` — how far
   *  the stage has since travelled out of view, 0-1, over which what is left
   *  of the rope is drawn down into the page. Cheap enough to call every
   *  frame; a no-op until the sample has loaded. */
  draw: (progress: number, exit?: number) => void;
};

/**
 * The portrait, and the machinery that takes it apart.
 *
 * Two layers over the same box: the photograph, masked away from the bottom
 * edge upward, and a canvas the width of the whole stage on which every pixel
 * the mask has removed reappears as a filament falling into one of three
 * bundles. Both are driven by the one progress value the hero scrubs, so
 * material never leaves the body anywhere the photograph is still there.
 *
 * The renderer itself is in lib/motion/wireEngine — it mutates typed arrays in
 * place on every frame, which is not something React should be holding.
 *
 * Under reduced motion none of it exists: no sampling, no canvas, no mask. The
 * photograph is a photograph.
 */
export function HeroPortrait({
  ref,
  alt,
  reduced,
}: {
  ref: RefObject<HeroPortraitHandle | null>;
  alt: string;
  reduced: boolean;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<WireEngine | null>(null);

  useImperativeHandle(
    ref,
    () => ({ draw: (p: number, exit?: number) => engine.current?.draw(p, exit) }),
    [],
  );

  useEffect(() => {
    const stageEl = stage.current;
    const boxEl = box.current;
    const canvasEl = canvas.current;
    if (reduced || !stageEl || !boxEl || !canvasEl) return;

    const wires = createWireEngine(stageEl, boxEl, canvasEl);
    engine.current = wires;
    wires.load(PORTRAIT_SAMPLE.src);

    // The accent is a token, and the token is re-pointed when the reader
    // switches scheme. Read it from the document rather than hard-coding it,
    // and read it again when the attribute that decides it changes.
    const scheme = new MutationObserver(() => wires.palette());
    scheme.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    let frame = 0;
    const resize = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => wires.measure());
    });
    resize.observe(canvasEl);

    return () => {
      scheme.disconnect();
      resize.disconnect();
      cancelAnimationFrame(frame);
      wires.destroy();
      engine.current = null;
    };
  }, [reduced]);

  return (
    <div ref={stage} className="portrait-stage pointer-events-none absolute inset-0">
      {/* The jumper is black and the page is nearly black. Without something
          behind him the silhouette has no edge at all. It goes as he goes. */}
      <div
        aria-hidden="true"
        className="hero-halo absolute bottom-0 left-1/2 h-[60svh] w-[60svh] -translate-x-1/2 rounded-full lg:h-[78svh] lg:w-[78svh]"
      />

      {/* The photograph. `portrait-veil` carries the mask; the canvas above
          draws back whatever the mask has taken away. */}
      <div
        ref={box}
        className="portrait-veil absolute bottom-0 left-1/2 h-[44svh] max-h-[820px] -translate-x-1/2 sm:h-[56svh] lg:h-[74svh]"
        style={{ aspectRatio: `${PORTRAIT.width} / ${PORTRAIT.height}` }}
      >
        <Image
          src={PORTRAIT.src}
          alt={alt}
          width={PORTRAIT.width}
          height={PORTRAIT.height}
          sizes="(min-width: 1024px) 40vw, 80vw"
          priority
          className="h-full w-full object-contain object-bottom"
        />
      </div>

      {!reduced && (
        <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      )}
    </div>
  );
}
