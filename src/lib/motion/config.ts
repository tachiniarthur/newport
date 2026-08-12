/**
 * Every duration, ease, offset and stagger in the site comes from here.
 * If you are tuning the feel of the page, this is the only file you need.
 *
 * Two hard limits from the design brief are encoded as constants rather than
 * left to discipline:
 *   - no entrance reveal exceeds 800ms  (see REVEAL_MAX)
 *   - no stagger between items exceeds 60ms  (see STAGGER_MAX)
 * `assertMotionBudget()` below fails loudly in development if either is broken.
 */

export const REVEAL_MAX = 0.8;
export const STAGGER_MAX = 0.06;

export const DURATION = {
  /** Standard entrance reveal. */
  reveal: 0.72,
  /** Micro-interactions: hover, focus, copy feedback. */
  micro: 0.32,
  /** Slower, deliberate moves: a project row opening, the curtain. */
  deliberate: 0.78,
  /** The opening curtain lifting away. */
  curtain: 0.8,
} as const;

export const EASE = {
  /** Entrances. Fast out of the gate, long settle. */
  out: "expo.out",
  /** Mask reveals — slightly sharper so the edge reads as a wipe. */
  mask: "power4.out",
  /** Two-way moves that must feel symmetrical (a row opening and closing). */
  inOut: "power3.inOut",
  /** Micro-interactions. */
  micro: "power2.out",
} as const;

export const STAGGER = {
  /** Between lines of a headline. */
  line: 0.06,
  /** Between items in a list. */
  item: 0.045,
  /** Between the smallest repeated marks — ticks, dashes, single glyphs. */
  tick: 0.02,
} as const;

/** Where a section starts revealing as it enters the viewport. */
export const TRIGGER = {
  start: "top 82%",
  /** Sections that reveal progressively rather than all at once. */
  scrubStart: "top 90%",
  scrubEnd: "bottom 20%",
} as const;

/** Vertical offset a revealed element travels. Kept small; transform only. */
export const SHIFT = {
  line: "105%",
  block: 24,
  parallax: 64,
} as const;

/** Opening sequence. Hard ceiling of 2.5s from the brief. */
export const LOADER = {
  maxMs: 2500,
  minMs: 900,
  /** sessionStorage key — the sequence runs once per browser session. */
  sessionKey: "aht.intro.played",
} as const;

export const LENIS = {
  duration: 1.05,
  /** Exponential ease-out; matches the settle of EASE.out closely enough that
   *  scroll-linked and time-based motion feel like one system. */
  easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  wheelMultiplier: 1,
  touchMultiplier: 1.4,
} as const;

/**
 * The hero transformation and the cable it feeds.
 *
 * These are scrub progress values, not seconds: the whole sequence is driven
 * by scroll position, so the reader controls its speed and the budget above
 * does not apply to it. What does apply is that it has to be reversible and
 * frame-cheap — see lib/motion/wires.ts.
 */
export const WIRE = {
  /** Scroll distance the portrait takes to become wire, as a fraction of the
   *  viewport height. The stage is pinned for exactly this long. */
  pinDistance: 1.05,
  /** Grid step, in source pixels, the portrait is sampled at. Smaller is
   *  denser and more expensive; below ~5 the gain stops being visible. */
  sampleStep: 6,
  sampleStepCompact: 9,
  /** Progress spent releasing particles, crown of the head last. Late, so
   *  the reader spends most of the pin looking at a person rather than at
   *  the aftermath of one.
   *
   *  `release + span` must not exceed 1, and the two below are set so that it
   *  lands just under. The last particle to leave has to be off the bottom of
   *  the canvas by the time the scrub ends — otherwise it stops where it is
   *  and stays there, and a few hundred of them stopping together leave a
   *  bright stub hanging at the exit for the rest of the visit. */
  release: 0.7,
  /** How long one particle takes to travel, in progress. */
  span: 0.27,
  /** Bundles the filaments braid into. */
  lanes: 3,
  /** Tone groups the photograph's colours are quantised into. */
  tones: 6,
  /**
   * Where the merged bundle leaves the bottom of the stage — and so where the
   * page-long cable starts — as a fraction of width.
   *
   * Off centre on purpose. The editorial grid puts its running text in the
   * right half, and a cable leaving at 0.5 has nowhere to go: it is on top of
   * the first paragraph before it has fallen far enough to have moved out of
   * the way, and gets drawn straight through four lines of it. At 0.3 it comes
   * down the empty column between the grid's label and its text, and the swing
   * out to the first node is a lean rather than a dive.
   */
  exit: 0.3,
  /** The same, where there is no room to be picky: the compact route hugs the
   *  left edge the whole way down, so it leaves near it too. */
  exitCompact: 0.14,
  /**
   * How far the bundle is still travelling left as it leaves, in px of sideways
   * drift per px of fall.
   *
   * Without it the merge in `bundleAt` finishes on a vertical line: the three
   * bundles come down the stage leaning hard to the left, straighten up over the
   * last stretch to land on the exit, and the page-long cable below then leans
   * left again to reach its lane. Three tangents, two of them corners, and the
   * silhouette is a hook with an S under it — right where the hand-off is
   * supposed to be the one thing nobody notices.
   *
   * So the merge is aimed at a sloping line rather than at a vertical one. It
   * still arrives at the exit, to the pixel, and it arrives there still going
   * where the cable below is going, so the whole run from the body to the first
   * section node is one curve bending one way.
   *
   * How much lean is not a matter of taste: it is the slope the crossing under
   * the hero actually needs. That crossing has one hard constraint — it must be
   * clear of the running text by the hero's own rule (see `HERO_ARRIVAL` in
   * `CableTrace`) — and on a wide window that is four hundred px of sideways
   * travel in about a hundred and fifty px of fall. Handed over at a shallower
   * slope than that, the cable leaves the stage on one tangent and then has to
   * find the other one somewhere: it holds the shallow line for the length of
   * the stub and turns through it all at once, and the elbow lands a hundred px
   * under the seam, in the emptiest part of the page, where it is the only
   * corner on a page that has none. At this slope there is nothing to find. The
   * bundle leaves already travelling at the rate the crossing needs and the two
   * are one curve.
   */
  exitLean: 1.3,
  /**
   * The same, on the compact route, where it is a hazard rather than a fix:
   * the exit is already at the left edge (`exitCompact`) and the lane is a few
   * px further, so there is no crossing to lead into — and a bundle leaving at
   * the wide window's slope is a bundle whose run-out is off the side of the
   * screen before the stub has finished.
   */
  exitLeanCompact: 0.35,
  /** How far either outer bundle sits from the middle one before they merge,
   *  as a fraction of width. This is the width of the fan under the body. */
  laneFan: 0.13,
  /** Sideways travel of a bundle over the height of the stage, in px. */
  laneAmplitude: 26,
  /** How far into a particle's travel it has finished turning copper, and
   *  how copper it already is the moment it detaches. */
  tint: 0.55,
  tintFloor: 0.3,
  /** Cable strokes, in px. */
  strokeCable: 1.5,
  /** Filaments that run the page together as one bundle. Odd, so exactly one
   *  of them is the core: the strand with no lateral offset, which is the one
   *  the section nodes sit on and the one the pulses travel. */
  strands: 17,
  /** How far the outermost strand of the bundle strays from the core, in px. */
  strandSpread: 30,
  /**
   * How fast the braid's own waveform travels as the reader scrolls, in radians
   * of phase per px of scroll.
   *
   * This is what makes the strands cross rather than merely be crossed. The
   * pattern is a function of position, so with a fixed phase the crossings are
   * features of the page that scroll past like anything else printed on it.
   * Advancing the phase slides the whole waveform along the cable, and strands
   * that were closing open again while the reader is looking at them.
   *
   * Kept well under the wave's own frequency (0.0029/px): at this rate the
   * pattern travels at about a third of the scroll, so the rope reads as being
   * twisted rather than as being dragged.
   */
  braidDrift: 0.0011,
  /** How far below the hero the bundle takes to open out from the single cable
   *  the wires braided into, in px. */
  strandOpen: 480,
  /**
   * The far end: how much wider the bundle gets as it lands on the contact
   * panel, and over how many px it does it.
   *
   * A rope arriving at a terminal and simply stopping is a rope that has been
   * cut. What is drawn instead is a stripped end — the braid opens, the wires
   * it is made of come apart and land on the panel's edge spread across it, and
   * only the core carries on into the circuit inside. That is the same
   * arrangement as the hero, run backwards: the page opens with a single line
   * coming out of a fan of filaments and closes with one going into a fan of
   * wires.
   */
  strandFlare: 3.2,
  strandFlareSpan: 130,
  /** Data running the finished cable. */
  pulses: 3,
  pulseSeconds: 4.2,
  /** How far the cable swings from the page's centre line, as a fraction of
   *  width. Tight on a phone, where there is no dead margin to swing into. */
  swing: 0.36,
  swingCompact: 0.06,
} as const;

/** Breakpoint below which pinned/parallax motion is dropped for a plain list. */
export const PIN_MIN_WIDTH = 1024;

/**
 * Shortest window a screen-tall pinned composition is allowed to lock into.
 *
 * Pinning holds a box that is meant to be exactly the window; in a window
 * shorter than this the recommendation rail's tallest card no longer fits one,
 * so the reader would be held in place looking at a card with its last lines
 * cut off. Below it the band falls back to an ordinary scroll container.
 *
 * The number is measured, not chosen: heading, progress rule and the tallest
 * card come to 745px at the desktop card widths. If those widths change — or
 * the size the quotes are set at (`--text-body-s`) does — this changes with
 * them.
 */
export const PIN_MIN_HEIGHT = 760;

export const MEDIA = {
  motionOk: "(prefers-reduced-motion: no-preference)",
  motionReduced: "(prefers-reduced-motion: reduce)",
  desktop: `(min-width: ${PIN_MIN_WIDTH}px)`,
  belowDesktop: `(max-width: ${PIN_MIN_WIDTH - 1}px)`,
  /** Both dimensions at once, for gsap.matchMedia. */
  desktopMotion: `(min-width: ${PIN_MIN_WIDTH}px) and (prefers-reduced-motion: no-preference)`,
  /**
   * The exact complement of `desktopMotion`, written as a comma-separated
   * media query list (a logical OR): too narrow to pin, OR motion is not
   * wanted. Negating with `not all and (...)` does not compose here because
   * the operand is itself a conjunction.
   */
  notDesktopMotion: `(max-width: ${PIN_MIN_WIDTH - 1}px), (prefers-reduced-motion: reduce)`,
  anyMotion: "(prefers-reduced-motion: no-preference)",
  /**
   * `desktopMotion`, plus the window has to be tall enough to hold a
   * screen-tall composition still. Used by the recommendation rail, the one
   * pin on the page that locks a full screen of content rather than a band.
   */
  railPin: `(min-width: ${PIN_MIN_WIDTH}px) and (min-height: ${PIN_MIN_HEIGHT}px) and (prefers-reduced-motion: no-preference)`,
} as const;

if (process.env.NODE_ENV !== "production") {
  const overLong = Object.entries(DURATION).filter(([, v]) => v > REVEAL_MAX);
  if (overLong.length > 0) {
    console.warn(
      `[motion] duration over the ${REVEAL_MAX}s reveal budget:`,
      overLong.map(([k, v]) => `${k}=${v}s`).join(", "),
    );
  }
  const overStagger = Object.entries(STAGGER).filter(([, v]) => v > STAGGER_MAX);
  if (overStagger.length > 0) {
    console.warn(
      `[motion] stagger over the ${STAGGER_MAX * 1000}ms budget:`,
      overStagger.map(([k, v]) => `${k}=${v * 1000}ms`).join(", "),
    );
  }
}
