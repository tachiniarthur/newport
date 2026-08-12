/**
 * The renderer behind the hero. Deliberately not a React component and not a
 * hook: it owns a canvas, a few megabytes of typed arrays and a per-frame
 * scratch buffer it mutates in place, none of which React should be looking
 * at. The component that mounts it holds one reference and calls `draw`.
 *
 * The contract is narrow on purpose:
 *   load()       — read the photograph, build the particle field. Once.
 *   measure()    — re-read the layout. On mount and on resize, never in a frame.
 *   palette()    — re-read the colour tokens. On mount and on scheme change.
 *   draw(p, out) — render progress 0-1, and how far the stage has since left.
 *                  Every frame of the scrub, and of the exit after it.
 */

import { PIN_MIN_WIDTH, WIRE } from "./config";
import {
  BUNDLE_MERGE_FROM,
  bundleAt,
  clamp01,
  easeOut,
  sampleWireField,
  type WireField,
} from "./wires";

/**
 * The band over which the canvas hands the cable to the page, in px above the
 * bottom of the stage. Must match `CableTrace`'s LEAD_IN, which is where its
 * own stroke starts fading up from nothing.
 *
 * Butt-jointed instead, the two are visibly different objects: the canvas
 * stroke stops dead at the stage's clipping edge, and the page's stroke is
 * still climbing out of its fade underneath it, so the seam reads as a bright
 * stub with a thinner line hanging off it. Crossfaded, there is one stroke of
 * one weight the whole way through and nothing to see.
 */
const HANDOFF = 160;

/** Tint steps a particle's colour is quantised into. With WIRE.tones this
 *  decides what a frame costs: 6 x 5 = 30 stroke calls instead of thousands. */
const BANDS = 5;

/** Distance back along its own path a filament is drawn from, in progress.
 *  Constant, so a fast particle draws a long tail and a slow one a short one
 *  without either being computed. */
const TAIL = 0.05;

type Metrics = {
  w: number;
  h: number;
  px: number;
  py: number;
  pw: number;
  ph: number;
  /** Where the merged bundle leaves, as a fraction of `w`, and how hard it is
   *  still travelling left as it gets there. Read at measure time rather than
   *  per frame — `CableTrace` picks them the same way, and the two have to
   *  agree to the pixel. */
  exit: number;
  lean: number;
};

export type WireEngine = {
  load: (src: string) => void;
  measure: () => void;
  palette: () => void;
  draw: (progress: number, exit?: number) => void;
  destroy: () => void;
};

/**
 * How much of the exit the rope takes to be drawn down into the page.
 *
 * The scrub ends with the transformation finished and the pin releasing, and
 * the stage still has a whole screen to travel before it is gone. What is on
 * it at that point is three lines and no particles — a still image, and the one
 * thing on the page that stops answering the scroll while the reader is still
 * looking at it. `exit` is how far the stage has travelled out of view, and
 * over the first `EXIT_SPAN` of it the bundle is consumed from the top: the
 * head runs down to the bottom edge, the rope shortens into the hand-off, and
 * the canvas is empty well before the stage carrying it has gone.
 *
 * The top of the rope needs no fade of its own — the gradient in `drawBundles`
 * already starts at zero alpha there, so what retracts is a soft end rather
 * than a cut one.
 */
const EXIT_SPAN = 0.8;

export function createWireEngine(
  stage: HTMLElement,
  box: HTMLElement,
  canvas: HTMLCanvasElement,
): WireEngine {
  let field: WireField | null = null;
  let metrics: Metrics = {
    w: 0,
    h: 0,
    px: 0,
    py: 0,
    pw: 0,
    ph: 0,
    exit: WIRE.exit,
    lean: WIRE.exitLean,
  };
  let destroyed = false;

  // Per-frame scratch, allocated with the field and never inside a frame.
  let x0 = new Float32Array(0);
  let y0 = new Float32Array(0);
  let x1 = new Float32Array(0);
  let y1 = new Float32Array(0);
  let groups: number[][] = [];
  /** The last frame drawn. Resizing the canvas wipes it, and a resize can
   *  land at a moment when nothing is going to call `draw` again — the stage
   *  gone from the screen is exactly such a moment — so every re-measure
   *  repaints the frame it was on. */
  let last = 0;
  let lastExit = 0;
  let colours: string[] = [];
  let glow: string[] = [];
  let accent: [number, number, number] = [210, 104, 58];

  function load(src: string) {
    const image = new Image();
    image.decoding = "async";

    const build = () => {
      if (destroyed) return;
      const step =
        window.innerWidth >= PIN_MIN_WIDTH ? WIRE.sampleStep : WIRE.sampleStepCompact;
      const built = sampleWireField(image, { step });
      if (!built) return;

      field = built;
      x0 = new Float32Array(built.count);
      y0 = new Float32Array(built.count);
      x1 = new Float32Array(built.count);
      y1 = new Float32Array(built.count);
      groups = Array.from({ length: built.tones.length * BANDS }, () => [] as number[]);

      palette();
      measure();
    };

    image.addEventListener("load", build, { once: true });
    // A missing sample is otherwise indistinguishable from a working hero: the
    // photograph still loads, the mask still erodes it, and only the filaments
    // are quietly absent. Say so, or a typo in the path costs an afternoon.
    image.addEventListener(
      "error",
      () => {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[wireEngine] portrait sample failed to load: ${src}`);
        }
      },
      { once: true },
    );
    image.src = src;
    if (image.complete) build();
  }

  /** One colour string per (tone, tint band) pair, plus the additive pass used
   *  on the bands that have already turned copper. */
  function palette() {
    if (!field) return;

    const styles = getComputedStyle(document.documentElement);
    accent = parseColour(styles.getPropertyValue("--color-accent")) ?? accent;
    const filament = parseColour(styles.getPropertyValue("--color-filament")) ?? [255, 176, 121];

    colours = [];
    glow = [];
    for (const tone of field.tones) {
      for (let band = 0; band < BANDS; band += 1) {
        const q = (band + 0.5) / BANDS;
        // A floor, not a straight ramp: half the body is a black jumper, and
        // black particles on a near-black page are particles nobody sees.
        const mix = clamp01(WIRE.tintFloor + (q / WIRE.tint) * (1 - WIRE.tintFloor));
        const r = Math.round(tone.r + (accent[0] - tone.r) * mix);
        const g = Math.round(tone.g + (accent[1] - tone.g) * mix);
        const b = Math.round(tone.b + (accent[2] - tone.b) * mix);
        // Filaments thin out as they fall; by then the bundle they feed is
        // what carries the weight.
        colours.push(`rgba(${r},${g},${b},${(0.92 - q * 0.35).toFixed(2)})`);
        glow.push(`rgba(${filament[0]},${filament[1]},${filament[2]},${(q * 0.14).toFixed(2)})`);
      }
    }
  }

  function measure() {
    const rect = canvas.getBoundingClientRect();
    const inner = box.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    metrics = {
      w: rect.width,
      h: rect.height,
      px: inner.left - rect.left,
      py: inner.top - rect.top,
      pw: inner.width,
      ph: inner.height,
      exit: window.innerWidth < PIN_MIN_WIDTH ? WIRE.exitCompact : WIRE.exit,
      lean: window.innerWidth < PIN_MIN_WIDTH ? WIRE.exitLeanCompact : WIRE.exitLean,
    };

    // Resizing the backing store resets every context property, the transform
    // included, so this has to come after it.
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
    }

    draw(last, lastExit);
  }

  function draw(progress: number, exit = 0) {
    const p = clamp01(progress);
    const gone = clamp01(exit / EXIT_SPAN);
    last = p;
    lastExit = clamp01(exit);

    // The mask that erodes the photograph, and the light behind it. Written
    // first and unconditionally, so the photograph and the particles never
    // disagree about how much body is left — including on the frames before
    // the sample has loaded. On the stage rather than on the photograph: the
    // halo is a sibling of it, and a halo still burning after the body it was
    // lighting has gone is a stain in the middle of an empty screen.
    stage.style.setProperty("--dissolve", String(clamp01(p / WIRE.release)));

    const ctx = canvas.getContext("2d");
    if (!ctx || !field || metrics.w === 0) return;

    ctx.clearRect(0, 0, metrics.w, metrics.h);
    if (p <= 0) return;

    // Nothing at all once the rope has been drawn down into the page.
    if (gone >= 1) return;

    const m = metrics;

    // And nothing but the rope while the stage is leaving. By the end of the
    // scrub every filament is past the bottom edge by construction — see
    // `release` and `span` in config — so the pass below would sweep the whole
    // field to produce an empty frame, and the exit is the one stretch where
    // this canvas is being repainted for the sake of three lines.
    if (gone > 0) {
      drawBundles(ctx, m, accent, p, gone);
      ctx.globalCompositeOperation = "source-over";
      return;
    }

    for (const group of groups) group.length = 0;

    const bottom = m.h + 40;

    for (let i = 0; i < field.count; i += 1) {
      const q = (p - field.delay[i]) / WIRE.span;
      if (q <= 0) continue;

      const now = q > 1 ? 1 : q;
      // A filament is drawn back along its own path — and at the start, all
      // the way back to the pixel it came from. That is the difference
      // between material being drawn out of a body and material falling off
      // one: while it is still attached, the line reaches the edge the mask
      // is currently eroding. It lets go as it picks up speed.
      const detach = clamp01((now - 0.2) / 0.5);
      const then = now > TAIL ? Math.min(now - TAIL, now * detach) : 0;

      const ox = m.px + field.ux[i] * m.pw;
      const oy = m.py + field.uy[i] * m.ph;
      const lane = field.lane[i];

      // The fall is resolved first, because where the bundle is depends on how
      // far down the particle already is. That is what bends a filament into
      // the cable instead of aiming it at a fixed point.
      const drop = m.h - oy + 180;
      const yNow = oy + drop * (now * now * 0.8 + now * 0.2);
      if (yNow > bottom) continue;
      const yThen = oy + drop * (then * then * 0.8 + then * 0.2);

      // The pull into the bundle finishes only at the end of a particle's
      // travel. Converging any faster turns the body into three whiskers
      // before it has finished being a body.
      const eNow = easeOut(now * 0.92 > 1 ? 1 : now * 0.92);
      const eThen = easeOut(then * 0.92 > 1 ? 1 : then * 0.92);

      const wobble = field.seed[i] * 6.283;
      const spread = (field.seed[i] - 0.5) * 44;
      const xNow =
        ox +
        (bundleAt(lane, yNow, m.w, m.h, m.exit, m.lean, spread) - ox) * eNow +
        Math.sin(wobble + now * 5.5) * 16 * (1 - eNow);
      const xThen =
        ox +
        (bundleAt(lane, yThen, m.w, m.h, m.exit, m.lean, spread) - ox) * eThen +
        Math.sin(wobble + then * 5.5) * 16 * (1 - eThen);

      x0[i] = xThen;
      y0[i] = yThen;
      x1[i] = xNow;
      y1[i] = yNow;

      const band = now >= 1 ? BANDS - 1 : (now * BANDS) | 0;
      groups[field.tone[i] * BANDS + band].push(i);
    }

    ctx.globalCompositeOperation = "source-over";
    for (let g = 0; g < groups.length; g += 1) {
      const group = groups[g];
      if (group.length === 0) continue;

      ctx.strokeStyle = colours[g];
      ctx.lineWidth = 1.05 + (g % BANDS) * 0.16;
      ctx.beginPath();
      for (const i of group) {
        ctx.moveTo(x0[i], y0[i]);
        ctx.lineTo(x1[i], y1[i]);
      }
      ctx.stroke();
    }

    // A second, additive pass over the filaments that have already turned —
    // only those, so the glow costs two thirds of nothing.
    ctx.globalCompositeOperation = "lighter";
    for (let g = 0; g < groups.length; g += 1) {
      if (g % BANDS < 3) continue;
      const group = groups[g];
      if (group.length === 0) continue;

      ctx.strokeStyle = glow[g];
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      for (const i of group) {
        ctx.moveTo(x0[i], y0[i]);
        ctx.lineTo(x1[i], y1[i]);
      }
      ctx.stroke();
    }

    drawBundles(ctx, m, accent, p, gone);
    ctx.globalCompositeOperation = "source-over";
  }

  function destroy() {
    destroyed = true;
    field = null;
    groups = [];
    x0 = new Float32Array(0);
    y0 = new Float32Array(0);
    x1 = new Float32Array(0);
    y1 = new Float32Array(0);
  }

  return { load, measure, palette, draw, destroy };
}

/**
 * The three bundles, drawn as continuous strokes once enough of the body has
 * come apart to have fed them. They leave the bottom edge at the fraction of
 * width `CableTrace` starts its own path from, which is the whole reason the
 * hand-off reads as one cable rather than as two effects.
 *
 * Only the middle one arrives there. The outer two lean in over the length of
 * the body and are faded out as they close, so what reaches the exit is one
 * line of one weight. Drawn to the edge instead, all three land on the same x
 * over the last hundred pixels: three strokes at one alpha stack into a dark
 * stub, and the angle they close at draws an arrowhead pointing straight at
 * the seam.
 */
function drawBundles(
  ctx: CanvasRenderingContext2D,
  m: Metrics,
  accent: [number, number, number],
  p: number,
  gone: number,
) {
  const formed = clamp01((p - 0.42) / 0.34);
  if (formed <= 0) return;
  if (gone >= 1) return;

  // Held back until the end of the scrub. For the whole of the pin the bottom
  // of the stage is the bottom of the screen and the page's own cable is below
  // the fold, so a bundle fading out before the edge would just be a cable
  // evaporating in mid-air. It is only worth crossfading at the moment the two
  // are about to be on screen together, which is the moment the pin releases.
  const handoff = clamp01((p - 0.86) / 0.14);

  const [r, g, b] = accent;

  for (let lane = 0; lane < WIRE.lanes; lane += 1) {
    // The head of the bundle climbs the body as the body is consumed — and
    // then, as the stage leaves, runs the other way: `gone` takes it down to
    // the bottom edge, which is the rope being paid out into the page rather
    // than a picture of a rope sliding off the top of the screen.
    const crown = m.py + m.ph * (1 - 0.15 - formed * 0.8);
    const top = crown + (m.h - crown) * gone;
    const outer = lane !== 1;

    ctx.beginPath();
    ctx.moveTo(bundleAt(lane, top, m.w, m.h, m.exit, m.lean, 0, 1, BUNDLE_MERGE_FROM), top);
    for (let y = top + 14; y < m.h + 20; y += 14) {
      ctx.lineTo(bundleAt(lane, y, m.w, m.h, m.exit, m.lean, 0, 1, BUNDLE_MERGE_FROM), y);
    }

    // Faded in along its own length rather than switched on: a hard-topped
    // stroke appearing in mid-air where the body used to be reads as a stray
    // line, not as a cable being fed.
    const head = 0.28 + formed * 0.6;
    // The gradient runs `top` to `m.h`, so a height in stage px has to be
    // expressed as a fraction of what is left below `top`.
    const at = (y: number) => clamp01((y - top) / Math.max(1, m.h - top));

    const ramp = ctx.createLinearGradient(0, top, 0, m.h);
    ramp.addColorStop(0, `rgba(${r},${g},${b},0)`);
    ramp.addColorStop(0.45, `rgba(${r},${g},${b},${(0.18 + formed * 0.35).toFixed(2)})`);
    if (outer) {
      // Gone by the time it would have touched the core, so the two never
      // stack on one line — see the note above.
      ramp.addColorStop(
        Math.min(0.99, Math.max(0.46, at(m.h * (BUNDLE_MERGE_FROM + 0.45)))),
        `rgba(${r},${g},${b},${head.toFixed(2)})`,
      );
      ramp.addColorStop(1, `rgba(${r},${g},${b},0)`);
    } else {
      ramp.addColorStop(Math.max(0.46, at(m.h - HANDOFF)), `rgba(${r},${g},${b},${head.toFixed(2)})`);
      ramp.addColorStop(1, `rgba(${r},${g},${b},${(head * (1 - handoff)).toFixed(2)})`);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = ramp;
    ctx.lineWidth = outer ? WIRE.strokeCable * 0.7 : WIRE.strokeCable;
    ctx.stroke();

    // Only the strand that carries on down the page gets a halo. All three
    // arrive at the same x, and three additive 6px glows stacked on one line
    // make a bright blob exactly where the hand-off is supposed to be
    // invisible.
    if (lane !== 1) continue;

    const halo = ctx.createLinearGradient(0, top, 0, m.h);
    halo.addColorStop(0, `rgba(${r},${g},${b},0)`);
    halo.addColorStop(at(m.h - HANDOFF), `rgba(${r},${g},${b},${(formed * 0.12).toFixed(2)})`);
    halo.addColorStop(1, `rgba(${r},${g},${b},${(formed * 0.12 * (1 - handoff)).toFixed(2)})`);

    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = halo;
    ctx.lineWidth = 6;
    ctx.stroke();
  }
}

/** Parses the hex form the design tokens are written in. Anything else — a
 *  colour function, an empty string from a detached element — falls back. */
function parseColour(value: string): [number, number, number] | null {
  const hex = value.trim();
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}
