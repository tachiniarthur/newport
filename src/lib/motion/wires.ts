/**
 * The geometry behind the one idea the page is built on: the portrait comes
 * apart into filaments, the filaments braid into a cable, the cable runs the
 * length of the document, and on the edge of the last section it comes apart
 * again into the wires it was made of.
 *
 * Everything here is a pure function of a single scrub progress value. Nothing
 * integrates, nothing remembers where it was on the previous frame — which is
 * what makes the whole thing scrub backwards as convincingly as it scrubs
 * forwards, and what stops it drifting when the main thread stalls. A particle
 * simulation would do neither.
 */

import { WIRE } from "./config";

/**
 * A field of particles sampled off the portrait. Stored as parallel typed
 * arrays rather than an array of objects: this is read in full on every
 * animated frame, and the layout matters more than the ergonomics do.
 */
export type WireField = {
  count: number;
  /** Origin inside the portrait box, 0-1. */
  ux: Float32Array;
  uy: Float32Array;
  /** Scrub progress at which this particle leaves the body. */
  delay: Float32Array;
  /** Deterministic per-particle noise, 0-1. Drives wobble and tail length. */
  seed: Float32Array;
  /** Which bundle this particle joins. */
  lane: Uint8Array;
  /**
   * Index into `tones`. Particles are grouped by tone so that a frame costs a
   * few dozen stroke calls instead of a few thousand — the single decision
   * that keeps this at 60fps.
   */
  tone: Uint8Array;
  /** Average colour of each tone group, taken from the photograph itself. */
  tones: { r: number; g: number; b: number }[];
};

/**
 * Reads the portrait once, at load, and turns every sufficiently opaque pixel
 * on a grid into a particle. The image must be same-origin (it is: /public),
 * or `getImageData` throws on a tainted canvas.
 */
export function sampleWireField(
  image: HTMLImageElement,
  { step, lanes = WIRE.lanes, toneCount = WIRE.tones, alphaFloor = 64 }: {
    step: number;
    lanes?: number;
    toneCount?: number;
    alphaFloor?: number;
  },
): WireField | null {
  const w = image.naturalWidth;
  const h = image.naturalHeight;
  if (w === 0 || h === 0) return null;

  const surface = document.createElement("canvas");
  surface.width = w;
  surface.height = h;
  const ctx = surface.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);

  const { data } = ctx.getImageData(0, 0, w, h);

  const cols = Math.floor(w / step);
  const rows = Math.floor(h / step);
  const max = cols * rows;

  const ux = new Float32Array(max);
  const uy = new Float32Array(max);
  const delay = new Float32Array(max);
  const seed = new Float32Array(max);
  const lane = new Uint8Array(max);
  const tone = new Uint8Array(max);

  // Running sums per tone group, converted to averages once the pass is done.
  const sums = Array.from({ length: toneCount }, () => ({ r: 0, g: 0, b: 0, n: 0 }));

  let count = 0;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      // Sample from the middle of the cell, not its corner.
      const sx = Math.min(w - 1, col * step + (step >> 1));
      const sy = Math.min(h - 1, row * step + (step >> 1));
      const p = (sy * w + sx) * 4;

      if (data[p + 3] < alphaFloor) continue;

      const r = data[p];
      const g = data[p + 1];
      const b = data[p + 2];

      const fx = sx / w;
      const fy = sy / h;

      ux[count] = fx;
      uy[count] = fy;

      // Deterministic noise. A hash of the grid position, not Math.random, so
      // a re-sample after a resize produces the identical field and the
      // transformation does not visibly reshuffle.
      const n = hash2(col, row);
      seed[count] = n;

      // The body comes apart from the bottom edge upward: a particle near the
      // bottom leaves immediately, one at the crown of the head leaves last.
      // The noise term is what keeps that edge ragged instead of a straight
      // horizontal line marching up the photograph.
      // Never negative: a particle with a negative delay is already in flight
      // on the first pixel of scroll, which shows up as a row of filaments
      // popping in along the bottom edge before anything has happened.
      delay[count] = Math.max(0, (1 - fy) * WIRE.release + (n - 0.5) * 0.05);

      lane[count] = Math.min(lanes - 1, Math.floor(fx * lanes));

      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const t = Math.min(toneCount - 1, Math.floor(lum * toneCount));
      tone[count] = t;
      sums[t].r += r;
      sums[t].g += g;
      sums[t].b += b;
      sums[t].n += 1;

      count += 1;
    }
  }

  const tones = sums.map((s) =>
    s.n === 0
      ? { r: 0, g: 0, b: 0 }
      : { r: Math.round(s.r / s.n), g: Math.round(s.g / s.n), b: Math.round(s.b / s.n) },
  );

  return { count, ux, uy, delay, seed, lane, tone, tones };
}

/** Deterministic 0-1 noise from a pair of integers. */
export function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Where the merged bundle sits on a stage `w` wide, in px. Both the canvas and
 *  the page-long cable start from this, which is the only reason the hand-off
 *  between them can be invisible. */
export function exitX(w: number, exit: number): number {
  return w * exit;
}

/**
 * Where the drawn bundles start gathering onto one line, as a fraction of the
 * stage height. Much higher than the particles' own merge: they are the cable,
 * and they have to arrive at the exit already parallel.
 *
 * Shared, because the page-long cable traces the same curve for the last stretch
 * of the hero — see `CableTrace`. Owned by neither of them: a copy in each is a
 * copy that can drift, and the two are only invisible while they agree.
 */
export const BUNDLE_MERGE_FROM = 0.3;

/**
 * Where a bundle is at a given height on a stage `w` by `h`.
 *
 * The two sine terms are deliberately incommensurate, so the three bundles
 * cross and separate down the length of the hero instead of running parallel
 * like a barcode. Further down they gather onto `exit`: the page below is fed
 * by a single cable, and three strands arriving at three different points
 * would make the hand-off obvious.
 *
 * The fan is centred on the body, which is centred on the stage. Only the
 * merge is off centre: the material is gathered towards `exit` over the length
 * of the fall rather than aimed at it from the start, so the hero keeps a
 * composition that answers to the photograph while the cable still leaves
 * where the page below has room for it.
 *
 * `spread` displaces one particle from the centre of its own bundle, and is
 * absorbed by the merge along with everything else. `mergeFrom` is where the
 * merge starts, as a fraction of the height. It is early on purpose: a merge
 * squeezed into the last third of the stage brings the outer bundles in at an
 * angle, and three lines meeting at an angle draw an arrowhead pointing at the
 * exact seam the whole arrangement exists to hide. Started high, the outer
 * bundles lean in over most of the body and are already parallel to the core
 * by the time they reach it.
 *
 * What they merge onto is a line that slopes, not a vertical one — `lean` is
 * its slope, in px sideways per px of fall (see `WIRE.exitLean`). It passes
 * through the exit at the bottom of the stage, so every caller still agrees to
 * the pixel about where the cable leaves; above that it stands off to the
 * right, and below it carries on to the left, which is what stops the bundle
 * straightening up into a vertical for the last hundred pixels of the hero and
 * then having to turn again underneath it. It is the caller's, like `exit`,
 * because the two answer the same question and the compact route answers it
 * differently.
 */
export function bundleAt(
  lane: number,
  y: number,
  w: number,
  h: number,
  exit: number,
  lean: number,
  spread = 0,
  mergeMax = 0.85,
  mergeFrom = 0.6,
): number {
  const phase = lane * 2.1;
  const a = WIRE.laneAmplitude;
  const target = exitX(w, exit) + lean * (h - y);
  const x =
    w * 0.5 +
    (lane - 1) * w * WIRE.laneFan +
    Math.sin(y * 0.006 + phase) * a +
    Math.sin(y * 0.017 + phase * 1.7) * a * 0.35;

  // For the cloud of particles, never a full merge: pulling all of them onto
  // one x would tie the field in a visible knot at the bottom edge, and 85% is
  // close enough to read as one cable while still looking like rope. The three
  // drawn strands do merge completely (`mergeMax` 1) — they are the cable, and
  // they have to arrive at the single point the page-long one starts from.
  const t = clamp01((y - h * mergeFrom) / (h * (1 - mergeFrom)));
  const merge = t * t * (3 - 2 * t) * mergeMax;

  return x + spread * (1 - merge) + (target - x) * merge;
}

/** Standard cubic ease-out. Written out rather than pulled from GSAP because
 *  it is called a few thousand times a frame. */
export function easeOut(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

/**
 * Fills in the run between two anchors so the cable swings rather than cuts.
 *
 * A straight line from a node on the left to a node on the right crosses a
 * whole section of text at a constant angle and reads as a scratch on the
 * screen. Interpolating with a smoothstep instead makes it leave one side
 * slowly, cross in the middle of the gap between sections, and arrive at the
 * next side slowly — which is what a cable strung between two points does.
 *
 * `bow` displaces the middle of the run sideways. It is what a leg between two
 * nodes on the same side gets instead of a swing: without it the run is a
 * dead-straight vertical rule, which is the one thing on the page that would
 * not read as a cable.
 *
 * `enter` is the sideways travel per px of fall the run is already carrying
 * when it starts — a run that is a continuation of something rather than a
 * departure from a standstill. Leaving one side slowly is right between two
 * nodes, where the run genuinely starts from rest; it is wrong directly under
 * the hero, where the cable arrives already going somewhere and a smoothstep
 * flattens it to vertical for a moment before letting it go again. Given a
 * tangent, the smoothstep becomes the Hermite that leaves along it and still
 * arrives at the far node with no sideways travel at all. At zero the two are
 * the same curve.
 */
export function swingBetween(
  a: { x: number; y: number },
  b: { x: number; y: number },
  bow = 0,
  enter = 0,
  steps = 14,
): { x: number; y: number }[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  // The tangent as a fraction of the run's own diagonal, which is the form the
  // Hermite basis wants it in. Refused rather than honoured when it points the
  // wrong way about — a run whose far end is back the way the cable came would
  // have to bulge past it and return, and no arrangement of nodes that produces
  // that is worth drawing a hook for. Capped at the far end, where the curve
  // would start doubling back on itself instead.
  const k = dx === 0 || dy === 0 ? 0 : Math.max(0, Math.min(3, (enter * dy) / dx));

  const out: { x: number; y: number }[] = [];
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const s = k * t * (1 - t) * (1 - t) + t * t * (3 - 2 * t);
    out.push({
      x: a.x + dx * s + Math.sin(Math.PI * t) * bow,
      y: a.y + dy * t,
    });
  }
  return out;
}

/**
 * The one run that has to turn a corner while it is still falling: the crossing
 * from the hero's exit into the cable's own lane.
 *
 * `swingBetween` cannot draw it. It puts a smoothstep on x and a straight ramp
 * on y, which is symmetric — half of the sideways travel is spent in the top
 * half of the fall and half in the bottom — so the run has to have arrived by
 * the time it is level with the first thing it is not allowed to cross. Given
 * only the room above that line, the result is a shallow diagonal that stops
 * dead: 400px sideways in 120px of fall, and then a hard turn into the vertical.
 *
 * Here the two ends are given tangents of their own instead. It leaves along
 * `enter` — the sideways travel per px of fall the cable is already carrying as
 * it comes out of the hero — and arrives straight down, and `settle` says how
 * much of the fall it spends arriving. A long settle is the whole point: the
 * sideways travel is finished early, in the room the crossing actually has, and
 * what is left is a long soft tail that eases into the lane well below the line
 * it had to be clear of. The turn is spread over twice the height and there is
 * no corner at the end of it.
 *
 * `lead` is the same thing at the near end, and is short: the cable leaves the
 * hero going somewhere and a long lead would flatten it against the exit before
 * letting it go.
 *
 * Both are fractions of the fall, and they are held under 1 between them so `ys`
 * comes out monotonic — `ribbonLengthAt` binary-searches it to cut the ribbon at
 * a height, and a run that doubled back would break every strand's head.
 *
 * The ends are the caller's, as in `swingBetween`: what comes back is what is
 * between them.
 */
export function sweepInto(
  a: { x: number; y: number },
  b: { x: number; y: number },
  enter: number,
  lead: number,
  settle: number,
  step = 20,
): { x: number; y: number }[] {
  const dy = b.y - a.y;
  if (dy <= 0) return [];

  const wanted = Math.max(0, lead) + Math.max(0, settle);
  const fit = wanted > 0.9 ? 0.9 / wanted : 1;
  const near = dy * Math.max(0, lead) * fit;
  const far = dy * Math.max(0, settle) * fit;

  // The two handles: one along the tangent the cable arrives with, one straight
  // up out of where it is going.
  const x1 = a.x + enter * near;
  const y1 = a.y + near;
  const x2 = b.x;
  const y2 = b.y - far;

  const steps = Math.max(12, Math.min(48, Math.round(Math.hypot(b.x - a.x, dy) / step)));

  const out: { x: number; y: number }[] = [];
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    const w0 = u * u * u;
    const w1 = 3 * u * u * t;
    const w2 = 3 * u * t * t;
    const w3 = t * t * t;
    out.push({
      x: w0 * a.x + w1 * x1 + w2 * x2 + w3 * b.x,
      y: w0 * a.y + w1 * y1 + w2 * y2 + w3 * b.y,
    });
  }
  return out;
}

/**
 * A polyline through `corners` with every corner between them replaced by a
 * circular arc of radius `radius`, sampled at roughly `step` px.
 *
 * `swingBetween` cannot draw these. It puts a smoothstep on x and a straight
 * ramp on y, which leaves a run vertical at both ends and does all of its
 * turning in the middle — right for a leg between two nodes on a page, and
 * wrong for a run that is 1300px wide and falls 90px, where the whole turn is
 * squeezed into a few px of height and reads as a mitred corner. Here the turn
 * has a radius, so it is as round as it is told to be regardless of how long
 * the runs either side of it are.
 *
 * The first and last entries are ends rather than corners: nothing is rounded
 * at them, and the arcs beside them may eat the whole of their segment. The
 * interior ones may only take half, so two adjacent corners can never overrun
 * each other. Where a corner has less room than the radius wants, the radius is
 * what gives.
 *
 * Sampled at a constant step rather than a constant count, because the result
 * is fed to `ribbonPath` — Catmull-Rom is uniformly parameterised, and a sudden
 * change of point density in it shows up as a bulge.
 */
export function roundedRun(
  corners: readonly { x: number; y: number }[],
  radius: number,
  step: number,
): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];

  const push = (x: number, y: number) => {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - x) < 0.05 && Math.abs(last.y - y) < 0.05) return;
    out.push({ x, y });
  };

  const run = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const steps = Math.max(1, Math.round(Math.hypot(dx, dy) / step));
    for (let i = 1; i <= steps; i += 1) {
      push(a.x + (dx * i) / steps, a.y + (dy * i) / steps);
    }
  };

  if (corners.length < 2) return corners.map((c) => ({ x: c.x, y: c.y }));

  push(corners[0].x, corners[0].y);
  let from = corners[0];

  for (let i = 1; i < corners.length - 1; i += 1) {
    const corner = corners[i];
    const next = corners[i + 1];

    const back = unit(from.x - corner.x, from.y - corner.y);
    const on = unit(next.x - corner.x, next.y - corner.y);
    const half = Math.acos(clamp(back.x * on.x + back.y * on.y, -1, 1)) / 2;

    // Straight through, or doubled back on itself: nothing to round.
    if (!(half > 0.02 && half < Math.PI / 2 - 0.02)) {
      run(from, corner);
      from = corner;
      continue;
    }

    const before = Math.hypot(from.x - corner.x, from.y - corner.y);
    // The far end of the next segment is another corner unless it is the last
    // entry, and two corners may not share more than half of what is between
    // them.
    const share = i + 1 < corners.length - 1 ? 0.5 : 1;
    const after = Math.hypot(next.x - corner.x, next.y - corner.y) * share;

    const cut = Math.min(radius / Math.tan(half), before, after);
    const r = cut * Math.tan(half);

    const start = { x: corner.x + back.x * cut, y: corner.y + back.y * cut };
    const end = { x: corner.x + on.x * cut, y: corner.y + on.y * cut };
    const bisector = unit(back.x + on.x, back.y + on.y);
    const centre = {
      x: corner.x + (bisector.x * r) / Math.sin(half),
      y: corner.y + (bisector.y * r) / Math.sin(half),
    };

    run(from, start);

    const a0 = Math.atan2(start.y - centre.y, start.x - centre.x);
    let sweep = Math.atan2(end.y - centre.y, end.x - centre.x) - a0;
    // The short way round. An arc replacing a corner is never the long way.
    while (sweep > Math.PI) sweep -= 2 * Math.PI;
    while (sweep < -Math.PI) sweep += 2 * Math.PI;

    const steps = Math.max(4, Math.ceil((Math.abs(sweep) * r) / step));
    for (let s = 1; s <= steps; s += 1) {
      const a = a0 + (sweep * s) / steps;
      push(centre.x + r * Math.cos(a), centre.y + r * Math.sin(a));
    }

    from = end;
  }

  run(from, corners[corners.length - 1]);
  return out;
}

function unit(x: number, y: number): { x: number; y: number } {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

/**
 * How fast the braid's waveform turns with height, in radians per px.
 *
 * Shared by the two halves of the same idea: `weave` takes the sine of this
 * angle to place a strand sideways, and `strandDepth` takes the cosine of it to
 * say how far through the thickness of the bundle that strand currently is. A
 * second copy of the number would be a rope whose front and back had nothing to
 * do with its left and right.
 */
export const TWIST = 0.0029;

/**
 * Where a strand sits through the thickness of the bundle, -1 (behind the core)
 * to 1 (in front of it).
 *
 * The bundle is a rope, not a set of rails: a strand at its furthest sideways
 * excursion is at the edge of the rope and neither in front nor behind, and one
 * crossing the middle is at its front or its back. That is the quadrature of the
 * waveform `weave` displaces with, which is why this is a cosine of the same
 * angle — and it is scaled by `lane` because the core, sitting on the axis, has
 * no radius to be in front of anything with.
 *
 * `phase` is the scroll-driven drift and `seed` the strand's own offset around
 * the rope, exactly as `weave` receives them summed.
 */
export function strandDepth(lane: number, y: number, phase: number, seed: number): number {
  return lane * Math.cos(y * TWIST + phase + seed);
}

/**
 * One strand of the bundle, held as parallel typed arrays.
 *
 * Not an array of points, and not for the reason the particle field is not:
 * this one is rebuilt on every scroll frame, so what matters is that rebuilding
 * it allocates nothing. `weave` overwrites the arrays in place, and the same
 * seventeen ribbons live for as long as the geometry does.
 *
 * `lens` is the cumulative length of the polyline through the points. It is a
 * slight underestimate of the length of the spline actually drawn through them
 * — which is exactly the right direction to be wrong in, because it is used as
 * the dash pattern: a dash shorter than the path leaves everything past the
 * head in the gap, whereas a dash longer than it would wrap and draw a second
 * segment at the far end.
 */
export type Ribbon = {
  xs: Float32Array;
  ys: Float32Array;
  lens: Float32Array;
  count: number;
  total: number;
};

export function createRibbon(count: number): Ribbon {
  return {
    xs: new Float32Array(count),
    ys: new Float32Array(count),
    lens: new Float32Array(count),
    count,
    total: 0,
  };
}

/**
 * Displaces the shared path sideways into `out`, by an amount that varies along
 * its own length, and measures the result.
 *
 * The displacement is perpendicular to the local direction of travel rather
 * than horizontal, so the bundle keeps its thickness through the swings
 * instead of flattening out wherever the cable runs diagonally.
 *
 * Three things stop it reading as a set of parallel rails. The waveform is a
 * sum of two incommensurate sines given a per-strand phase, so strands drift
 * apart, close up and cross each other down the page; it is allowed to go
 * slightly negative, which is what makes them actually swap sides rather than
 * just breathe; and `phase` is not a constant — the caller advances it with the
 * scroll, which slides the whole waveform along the cable so the crossings
 * happen while the reader is watching instead of merely existing where the
 * reader arrives.
 *
 * The `open` ramp holds the whole bundle at zero width where it leaves the hero
 * — everything arrives there as the single cable the filaments braided into,
 * and the rope only comes apart further down. `openFrom` is the y that ramp is
 * measured from, and it is the exit rather than the start of the path: the path
 * starts inside the hero, where the canvas is still drawing this cable as one
 * 1.5px line, and a bundle already a third open by the time it gets to the seam
 * puts a second strand alongside a stroke that has no second strand.
 *
 * `flareAt` is the other end of the same idea: the y the bundle opens out at,
 * over `WIRE.strandFlareSpan` above it, so the wires arrive at the contact panel
 * spread across its edge rather than as a rope that stops. Zero for a path with
 * no terminus. Past it the ramp is held rather than allowed to keep growing —
 * only the core is drawn down there, but a ramp that ran away would still be
 * feeding the geometry the branches of the panel's circuit start from.
 *
 * `flare` is how much wider it gets, and the caller owns it for the same reason
 * it owns `spread`: on a phone the cable is already at the first character of
 * every line, and a fan that opened out to its full width there would be a fan
 * opening out over the type.
 */
export function weave(
  points: { x: number; y: number }[],
  lane: number,
  spread: number,
  phase: number,
  open: number,
  openFrom: number,
  out: Ribbon,
  flareAt = 0,
  flare: number = WIRE.strandFlare,
): void {
  const n = Math.min(points.length, out.count);
  const { xs, ys, lens } = out;

  for (let i = 0; i < n; i += 1) {
    const point = points[i];
    const prev = points[i - 1] ?? point;
    const next = points[i + 1] ?? point;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const length = Math.hypot(dx, dy) || 1;

    // Centred low rather than at the middle of its own swing: a waveform that
    // never changed sign would be seventeen strands breathing on their own
    // sides of the cable and never once passing each other, and the whole
    // over-and-under in `CableTrace` would have nothing to resolve. At this
    // offset a strand spends most of a turn on its own side and the rest of it
    // across the others, which is what the crossings are.
    const wave =
      0.35 +
      0.55 * Math.sin(point.y * TWIST + phase) +
      0.22 * Math.sin(point.y * 0.0081 + phase * 1.9);

    const fan =
      flareAt === 0
        ? 0
        : clamp01((point.y - (flareAt - WIRE.strandFlareSpan)) / WIRE.strandFlareSpan);

    const amount =
      lane * spread * wave * clamp01((point.y - openFrom) / open) * (1 + flare * fan);

    xs[i] = point.x + (-dy / length) * amount;
    // Straight across in the fan rather than square to the cable. The two are
    // nearly the same thing where it happens — the cable is vertical by then —
    // but only one of them leaves `ys` untouched, and a ribbon whose ys are not
    // monotonic cannot be cut at a height: `ribbonLengthAt` binary-searches
    // them, and the wires would land tens of px either side of where they were
    // told to. Displacing along the cable is also the one thing the fan must not
    // do, being the thing that decides how far down each wire reaches.
    ys[i] = point.y + (dx / length) * amount * (1 - fan);
  }

  lens[0] = 0;
  let run = 0;
  for (let i = 1; i < n; i += 1) {
    run += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]);
    lens[i] = run;
  }
  out.total = run;
}

/**
 * A smooth path through a ribbon, as an SVG `d` string.
 *
 * Catmull-Rom converted to cubic Béziers: the curve passes exactly through
 * every point, which matters here because the points are the interactive nodes
 * and a node that does not sit on its own cable looks like a bug.
 *
 * This is the most expensive thing on a scroll frame — not the geometry above
 * it, which is a tenth of the cost, but the six numbers per segment being
 * formatted into text. Hence the concatenation rather than an array and a join,
 * which measured a third faster for exactly this shape, and hence the tenth of
 * a pixel: whole pixels are three times faster again, but the anchors then snap
 * between two integers as the phase drifts and a half-opacity hairline shimmers
 * where it should drift.
 */
export function ribbonPath(ribbon: Ribbon, tension = 0.42): string {
  const { xs, ys, count } = ribbon;
  if (count === 0) return "";
  if (count === 1) return `M ${round(xs[0])} ${round(ys[0])}`;

  const k = tension / 3;
  let d = `M ${round(xs[0])} ${round(ys[0])}`;

  for (let i = 0; i < count - 1; i += 1) {
    const back = i === 0 ? 0 : i - 1;
    const ahead = i + 2 > count - 1 ? count - 1 : i + 2;

    const c1x = xs[i] + (xs[i + 1] - xs[back]) * k;
    const c1y = ys[i] + (ys[i + 1] - ys[back]) * k;
    const c2x = xs[i + 1] - (xs[ahead] - xs[i]) * k;
    const c2y = ys[i + 1] - (ys[ahead] - ys[i]) * k;

    d += ` C ${round(c1x)} ${round(c1y)}, ${round(c2x)} ${round(c2y)}, ${round(xs[i + 1])} ${round(ys[i + 1])}`;
  }

  return d;
}

/** Distance along a ribbon at a given vertical position. `ys` is monotonic for
 *  the paths this builds, so a binary search is exact enough and costs nothing
 *  on a scroll frame. */
export function ribbonLengthAt(ribbon: Ribbon, y: number): number {
  const { ys, lens, count } = ribbon;
  if (count === 0) return 0;
  if (y <= ys[0]) return 0;
  if (y >= ys[count - 1]) return ribbon.total;

  let low = 0;
  let high = count - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (ys[mid] < y) low = mid;
    else high = mid;
  }

  const span = ys[high] - ys[low];
  const t = span === 0 ? 0 : (y - ys[low]) / span;
  return lens[low] + (lens[high] - lens[low]) * t;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
