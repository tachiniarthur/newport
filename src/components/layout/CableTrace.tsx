"use client";

import { useGSAP } from "@gsap/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Dictionary } from "@/content/dictionaries";
import { MEDIA, PIN_MIN_WIDTH, WIRE } from "@/lib/motion/config";
import { useMotion } from "@/lib/motion/MotionProvider";
import { ScrollTrigger, gsap } from "@/lib/motion/register";
import {
  BUNDLE_MERGE_FROM,
  bundleAt,
  clamp01,
  createRibbon,
  exitX,
  hash2,
  ribbonLengthAt,
  ribbonPath,
  strandDepth,
  sweepInto,
  swingBetween,
  weave,
  type Ribbon,
} from "@/lib/motion/wires";

/**
 * What the hero turns into: a bundle of cables running the height of the
 * document, touching down once per section, and coming apart on the edge of the
 * last one.
 *
 * The strands share one measured path and are displaced off it individually —
 * see `weave` — so the bundle behaves as one rope: it swings as a unit, opens
 * out where it has room and closes up where it does not. One strand, the core,
 * has no displacement at all. That is the one the section nodes sit on and the
 * one data travels, so neither of those can ever drift off the cable, and it is
 * the one strand whose geometry never changes after it is measured.
 *
 * The others are rewoven on every scroll frame, at a phase the scroll advances,
 * so the rope twists under the reader rather than presenting them with a
 * twisting already printed on the page. That is sixteen splines rebuilt per
 * frame; it is affordable only because none of it touches the DOM to measure —
 * the points go into typed arrays that are reused, and the dash length comes
 * from the polyline the same pass accumulated rather than from
 * `getTotalLength`, which would re-tessellate every path it was asked about.
 *
 * A rope is also strands passing in front of one another, and seventeen
 * translucent lines sharing a lane are not: they add up wherever they meet, so
 * a crossing reads as a bright spot rather than as one wire over another. So
 * each strand knows how far through the thickness of the bundle it currently is
 * — the cosine of the angle `weave` takes the sine of, see `strandDepth` — and
 * that decides three things: the order the strands are painted in, how heavy
 * and bright each one is, and whether it carries a casing in the page's own
 * colour that cuts a gap in everything behind it. The stack is re-sorted as the
 * reader scrolls, so a wire that was underneath comes over the top while they
 * are watching.
 *
 * The path is measured from the page rather than authored, so it stays correct
 * when a section grows, when the fonts land, or when the reader resizes. It is
 * drawn to wherever the reader has got to — the head of the stroke sits a
 * little below their eye line the whole way down, which is what makes it read
 * as being pulled along by the scroll rather than played back at it.
 *
 * Nothing is drawn ahead of the reader. There is no ghost of the route to
 * come: a static full-height line would be the one element on the page that
 * does not answer to the scroll, and next to a hero that is still moving it
 * reads as a mistake rather than as a preview.
 *
 * The nodes are a real navigation: anchors, focusable, labelled, and lit when
 * the section they point at is the one being read.
 */

/**
 * How much cable exists before the reader has scrolled to it, in px of vertical
 * travel. Covers the hand-off from the hero and nothing more.
 *
 * It is paid for by the hero's pin. Pinned, the stage stands at the top of the
 * screen while the document goes on underneath, so the first stretch of cable
 * is laid somewhere nobody can see and is already there at the moment the pin
 * releases and it comes up over the bottom edge — otherwise the wires leaving
 * the hero arrive at a bundle that has not been laid yet.
 *
 * Where there is no pin there is no cover, and the head start is drawn on the
 * first screen instead: a length of wire lying across the portrait before the
 * reader has done anything at all, which is the opposite of a cable the scroll
 * pulls into being. So whether it is spent is not a question about the window —
 * it is a question about whether the hero is pinned, which is asked of the
 * layout rather than inferred from a breakpoint: a pinned element is wrapped in
 * a pin spacer by ScrollTrigger, and that spacer either exists or it does not.
 * Where it does not, this is zero and the cable starts where the reader's own
 * eye line reaches it — see `headStart` on the loom.
 */
const HEAD_START = 420;

/** Where the head of the cable rides on the screen, as a fraction of the
 *  window: below the reader's eye line, far enough ahead to feel like it is
 *  leading them and close enough to be caused by them. Everything the arrival
 *  drives is timed off this one line, so it is one number. */
const EYE = 0.62;

/**
 * The hand-off from the hero, in px.
 *
 * Two lines meeting end to end at one point is the hardest joint to hide, so
 * they are not asked to meet at a point. This bundle starts `LEAD_IN` above the
 * exit, inside the last band of the hero, and fades up from nothing over
 * exactly that distance while the canvas fades its own core out over the same
 * band (`HANDOFF` in wireEngine). The two are never both at full strength and
 * never both absent, so there is one cable of one weight running through a seam
 * that is not anywhere.
 *
 * Overlapping is only half of it. The two also have to be the *same line* over
 * the overlap, and a straight drop to the exit is not: the canvas's bundle is
 * still gathering onto the exit through the whole of that last band — 44px off
 * it at the top of a 160px lead-in, on a 1600px stage — so a vertical lead-in
 * puts a second stroke alongside the first and the crossfade draws a long thin
 * eye instead of a cable. So the lead-in is not authored at all: it is sampled
 * from `bundleAt`, the function the canvas draws its core with, at the stage's
 * own measured height. One curve, drawn twice, handed from one renderer to the
 * other in the middle.
 *
 * The same sampling carries on for `STUB` below the exit. Past the bottom of
 * the stage the merge is complete, so those samples come out as the straight
 * run-out of the braid on their own — the cable leaves in the direction it
 * arrived, because it is still the same curve, not because a segment was pinned
 * there. That direction is not vertical (see `WIRE.exitLean`), which is why the
 * anchor at the end of the stub is read off the sampled curve rather than
 * assumed to be the exit: authored at the exit's own x, it would put a 17px jog
 * to the right at the seam, which is the one place on the page that cannot
 * afford one.
 */
const LEAD_IN = 160;
const STUB = 72;
const EMERGE = LEAD_IN;

/** How finely the lead-in retraces the canvas's curve, in px. Close enough to
 *  the spacing `swingBetween` produces that the spline through the two reads as
 *  one run: Catmull-Rom is uniformly parameterised, and a sudden change of
 *  point density in it shows up as a bulge. */
const LEAD_STEP = 18;

/**
 * Where the cable runs inside the room reserved for it — see `laneAt`.
 *
 * `LANE_BIAS` is the fraction of that room the core sits at, measured from the
 * page's own left edge. Under a half, so the cable belongs to the margin rather
 * than to the column: hung off the type at a fixed distance instead, it reads
 * as decoration attached to the first character of every line, and on a wide
 * window it sits close enough to be the first thing the eye hits on the way
 * into a paragraph.
 *
 * `CLEAR` is the floor under that — the least the core may be from the type
 * where there is not enough room for the bias to matter — and `EDGE` the floor
 * on the other side, so the fray never runs off the left of the window.
 */
const LANE_BIAS = 0.45;
const CLEAR = 72;
const EDGE = 40;

/**
 * The same two floors, for the lane a phone actually has.
 *
 * A desktop reserves about 200px to the left of the type and these floors are
 * sized for it. A phone reserves 40 — `--gutter` plus `--cable-lane`, both at
 * 1.25rem — and against 40, floors of 72 and 40 do not describe a narrower
 * version of the same lane, they describe a lane that does not exist: `type -
 * CLEAR` comes out negative, the `max` with `EDGE` then puts the core on the
 * first character of every line, and the room falls back to its own floor of 72
 * and authorises a 36px bow into the column. That is the wire over the text.
 *
 * So the rule is unchanged and only the numbers are re-cut to the room: the
 * core sits at the same fraction of the lane (`LANE_BIAS`), keeps `CLEAR_COMPACT`
 * off the type and `EDGE_COMPACT` off the window's edge. What it does lose is
 * the floor under `room` — see `laneAt`. A serpentine the lane cannot pay for is
 * one the column pays for, and on a phone the column has nothing to give.
 */
const CLEAR_COMPACT = 18;
const EDGE_COMPACT = 10;

/**
 * Slack. Each run bulges sideways, alternating direction, so the cable is a
 * long shallow serpentine rather than a rule.
 *
 * `BOW_RATE` is what a run of a given length would like; what it gets is capped
 * at half the room the lane actually has, because the bulge towards the page is
 * the one that decides whether the bundle ever reaches the text.
 */
const BOW_RATE = 0.03;
const BOW_OF_LANE = 0.5;
const BOW_MAX = 44;

/**
 * The over-and-under.
 *
 * Every strand is drawn twice: once in the page's own colour, a little wider
 * than itself, and then once as the wire. The casing is what a strand in front
 * cuts through the strands behind it with — no strand is transparent to the one
 * above it any more, so the bundle reads as rope rather than as seventeen
 * hairlines sharing a lane.
 *
 * `CASING` is how far it stands proud of its own wire, in px — the width of the
 * gap the crossing strand leaves. `CASING_MAX` is how opaque it gets at the very
 * front; strands at the back of the rope get none of it, which is what stops
 * the crossings being decided by the order the strands happen to be drawn in.
 *
 * `PANEL_FADE` is the run-out into the one section of the page that is not the
 * page's colour: the casing is the paper, so over the contact panel it would be
 * a pale hyphen at every crossing instead of a hole. It is gone by the time it
 * gets there, and the depth is carried by weight and brightness alone from then
 * on.
 */
const CASING = 3;
const CASING_MAX = 0.92;
const PANEL_FADE = 160;

/**
 * The terminus.
 *
 * The contact panel is the only thing on the page the cable arrives at rather
 * than runs past, and it is where the cable ends: the braid comes apart over the
 * last stretch above it (see `WIRE.strandFlare`) and every wire lands on the
 * panel's top edge. Nothing is drawn inside the panel. There is no supply to
 * follow down it and no reason to draw one — a rope carried across a surface it
 * has already arrived at is a rope going nowhere, on top of the one section that
 * is asking the reader to do something.
 *
 * A wire that has landed is finished. The bundle above is rewoven on every frame
 * at a phase the scroll advances — that is what makes the rope twist under the
 * reader — but a wire that has arrived somewhere and then carries on moving has
 * not arrived. So each one stops reading the scroll at the moment its own head
 * reaches the edge: `settled` below caps the scroll position the strand is woven
 * at, which freezes its whole geometry there and unfreezes it, continuously and
 * from the same value, if the reader takes the scroll back up. It is still a
 * pure function of scroll position — there is no memory of having landed, only a
 * number that stops rising.
 *
 * What the arrival does drive is the section itself: the panel takes the colour
 * of the wire, filling from the top as the reader brings it up, and its blocks
 * arrive in turn. All of it hangs off the scroll and nothing off a timeline, so
 * the section assembles at exactly the rate it is scrolled into view and comes
 * apart again on the way back.
 *
 * `LAND` is how far past the edge the path runs, so the round caps of the wires
 * sit on the boundary rather than short of it. `TAP_LEAD` is how far above the
 * eye line a block arrives. The panel carries no node of its own — see `STOPS`.
 *
 * The colour starts where the wires do. It is the wires that are supposed to be
 * laying it down, so a fill that had already run a screen into the panel by the
 * time they touched the edge read as two unrelated things happening at once —
 * which is what `EYE` is doing in the fill: the first colour appears at the
 * scroll where the heads reach the panel's top edge, not before. `FILL_EYE` is
 * only the other end of it, where on the screen the colour's own edge sits by
 * the time the panel is full: high enough that it has always reached the bottom
 * of the panel by the time the page runs out of scroll. `FILL_FADE` is how soft
 * that edge is, in px — a hard rule sweeping across a heading reads as a
 * rendering fault rather than as the panel being filled.
 *
 * And the edge is not level. `FILL_SKEW` tilts it, in degrees, so the colour
 * reaches the left of the panel first and runs off to the right — the wires
 * come down the left of the page, and a rule arriving dead flat across the full
 * width is the one thing they could not have painted. The tilt is a `skewY`
 * about the element's own left edge, which holds the right of the panel back by
 * the width through that angle and leaves the left arriving exactly where an
 * untilted edge would. That distance is `slant`: the fill is that much taller,
 * and travels that much further, so that a full panel is still a full panel.
 */
const LAND = 4;
const TAP_LEAD = 120;
const FILL_EYE = 0.88;
const FILL_FADE = 160;
const FILL_SKEW = 6;

/** How often the stack is re-sorted, in frames. The rope turns at a fraction of
 *  the scroll; resorting it every frame would be seventeen comparisons to
 *  discover that nothing had moved. */
const RESTACK_EVERY = 6;

/** Sections the cable touches down at, in document order. The panel is not one
 *  of them: the cable does not run past it, it ends on it, and the landing is
 *  already the mark — a node a few px above a bundle coming apart onto an edge
 *  is a second thing happening at the one place the eye is already going. What
 *  the cable stops at is pushed on below, as a point rather than as a stop. */
const STOPS = ["about", "stack", "timeline", "projects", "testimonials"] as const;

/**
 * Where the cable finishes crossing from the hero's exit into its lane, and
 * what shape it makes getting there — see `sweepInto`.
 *
 * `HERO_ARRIVAL` is how far down to the first node the crossing may take, as a
 * fraction. Without a limit it is one run: four hundred px sideways spread over
 * everything between the hero and About, which reads as a rule ruled across the
 * top of the page rather than as a cable finding its lane.
 *
 * What it may not do is be anywhere near the text while it is doing it. The
 * hero's own rule is the first thing under the hero that the cable is not
 * allowed to touch, and by the height of that rule the crossing has to be at
 * least `CLEAR` to the left of where the type starts — the same distance the
 * lane itself keeps. Both are measured (`[data-cable-clear]`) rather than
 * assumed, so the room reserved for this in the hero and the cable's use of it
 * cannot drift apart.
 *
 * That used to be written as a ceiling on the arrival: the crossing had to be
 * *finished* above the rule. It is a much harder condition than the one that
 * matters, and it is what made the crossing a shallow diagonal with a corner at
 * the end — all of the sideways travel squeezed into the 120px above the rule,
 * and then a hard turn into the vertical. Being clear of the type by the rule
 * asks only that the travel is *mostly* done there, which leaves the rest of it
 * free to ease into the lane a couple of hundred px lower, alongside a margin
 * that has nothing in it. So the arrival is the deepest one that still clears,
 * found by bisection against the curve actually drawn rather than by a formula
 * that would have to be kept in step with it.
 *
 * `HERO_CLEARANCE` is now only the least fall worth drawing a crossing over,
 * and the arrival a viewport with no room at all falls back to.
 *
 * `HERO_LEAD` and `HERO_SETTLE` are the two tangents, as fractions of the fall.
 * The settle is the long one: it is what turns the corner into a tail.
 */
const HERO_ARRIVAL = 0.45;
const HERO_CLEARANCE = 34;
const HERO_LEAD = 0.22;
const HERO_SETTLE = 0.58;

type Node = {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Which side of the dot the label opens on. Away from the running text. */
  label_side: "left" | "right";
};

/** The vertical band the cable is allowed into, in layer coordinates. `room` is
 *  how far it may swing either way from `x` without touching the type on one
 *  side or leaving the window on the other. */
type Lane = { x: number; room: number };

type Strand = {
  d: string;
  width: number;
  opacity: number;
  /** How far this strand strays from the core, -1 to 1. Zero for the core. */
  lane: number;
  /** This strand's own place around the rope, in radians. Handed to `weave` as
   *  the phase and to `strandDepth` as the seed, so where it is sideways and
   *  how deep it is are two readings of one angle. */
  seed: number;
  /** Where it starts through the thickness of the bundle, -1 to 1. Only the
   *  first frame's worth: the loop recomputes it at the reader's eye line. */
  depth: number;
  /** Lead or lag of this strand's head, in px. A bundle cut square across all
   *  seventeen strands reads as a wipe; a ragged end reads as rope. */
  lead: number;
  /** The layer y this strand is drawn no further than. Infinite for the core. */
  stop: number;
  core: boolean;
};

/** What the cable turns on when it gets there. Positions are in layer
 *  coordinates, and every one of them is a y the reader's eye line passes. */
type Terminus = {
  /** The colour, held in an element of its own so the fill is a transform and
   *  never a repaint of the largest box on the page. */
  fill: HTMLElement;
  /** The panel's own top edge and height. */
  at: number;
  height: number;
  /** How far the tilt holds the panel's right edge back, in px. */
  slant: number;
  /** The blocks the section is assembled from, and where each arrives. */
  blocks: { el: HTMLElement; at: number }[];
};

/** Everything a frame needs to reweave the bundle, none of which React should
 *  be re-rendering for. */
type Loom = {
  /** The shared path every strand is displaced off. */
  base: { x: number; y: number }[];
  /** One reusable ribbon per strand, in the same order as `strands`. */
  ribbons: Ribbon[];
  /** Where the strands start opening out — the hero's exit. */
  openFrom: number;
  spread: number;
  /** And where they open out again, on their way into the panel, and by how
   *  much. */
  flareAt: number;
  flare: number;
  /** How much of the run is drawn before the reader has reached it. Zero where
   *  the hero is not pinned to hide it — see `HEAD_START`. */
  headStart: number;
};

export function CableTrace({ dict }: { dict: Dictionary }) {
  const layer = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const casings = useRef<(SVGPathElement | null)[]>([]);
  const landings = useRef<(SVGPathElement | null)[]>([]);
  const groups = useRef<(SVGGElement | null)[]>([]);
  const bundle = useRef<SVGGElement>(null);
  const pulses = useRef<SVGCircleElement[]>([]);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [strands, setStrands] = useState<Strand[]>([]);
  const [startY, setStartY] = useState(0);
  /** Where the one section that is not the page's colour begins: the casing has
   *  to be gone by then, the wires land there, and the fan is only lit over the
   *  last stretch above it. */
  const [panelY, setPanelY] = useState(0);
  const [nodes, setNodes] = useState<Node[]>([]);
  /** How many blocks the panel is assembled from. Nothing is rendered from it —
   *  it is the dependency that re-runs the loop when the section's shape
   *  changes, so the blocks it holds are never elements React has replaced. */
  const [taps, setTaps] = useState(0);
  const nodeKey = useRef("");
  const geometryKey = useRef("");

  const { scrollTo } = useMotion();

  const loom = useRef<Loom | null>(null);
  /** Read by the scroll loop, so a frame never waits on React. */
  const terminus = useRef<Terminus | null>(null);

  const measure = useCallback(() => {
    const root = layer.current;
    if (!root) return;

    const rect = root.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (width === 0 || height === 0) return;

    const top = rect.top + window.scrollY;
    const compact = window.innerWidth < PIN_MIN_WIDTH;
    const swing = (compact ? WIRE.swingCompact : WIRE.swing) * width;
    const centre = compact ? width * 0.12 : width * 0.5;

    // Where the cable is going. Measured first because everything below is
    // either aimed at it, opening out into it, or stopping at it.
    const panel = document.querySelector<HTMLElement>('[data-scheme="ink"]');
    const panelTop = panel
      ? panel.getBoundingClientRect().top + window.scrollY - top
      : height - 2;

    // `bow` belongs to the run arriving at the point, not to the point.
    // `raw` marks a point that is already where it belongs — one of the samples
    // the detour resolved for itself — so the run into it is taken as drawn
    // rather than interpolated from the one before.
    const points: { x: number; y: number; bow: number; raw?: boolean }[] = [];

    // The retraced tail of the hero's own bundle, kept apart from the anchors
    // above: these are already a curve, sampled densely, and running
    // `swingBetween` between each consecutive pair of them would interpolate a
    // curve that is not missing anything.
    const lead: { x: number; y: number }[] = [];

    // Measured off those elements' own boxes rather than off this layer's, so
    // the two agree on where the middle of the stage is even if they do not
    // agree on where their own left edge is.
    const startEl = document.querySelector<HTMLElement>("[data-cable-start]");
    const stageEl = document.querySelector<HTMLElement>("[data-cable-stage]");
    /** Whether the hero is currently held on screen, which is the only thing
     *  that can hide a head start — see `HEAD_START`. Read off the pin spacer
     *  ScrollTrigger wraps a pinned element in, so a branch that stops pinning
     *  stops being given cover it no longer has. */
    const heroPinned = () =>
      Boolean(stageEl?.parentElement?.classList.contains("pin-spacer"));
    // Where the exit is, in this layer's coordinates. The strands open out
    // from here rather than from the head of the path — see `braidStrand`.
    let exitY = 0;
    // Sideways travel per px of fall the cable is carrying as it leaves the
    // hero. Handed to the first run so it continues rather than restarts.
    let enter = 0;

    if (startEl) {
      const startRect = startEl.getBoundingClientRect();
      const left = startRect.left - rect.left;
      const fraction = compact ? WIRE.exitCompact : WIRE.exit;
      const lean = compact ? WIRE.exitLeanCompact : WIRE.exitLean;
      const exit = left + exitX(startRect.width, fraction);
      exitY = startRect.top + window.scrollY - top;

      // The stage sits directly above this marker and is the same box the
      // canvas fills, so its height is the `h` the canvas passed to `bundleAt`
      // and its bottom edge is this y. Without it there is nothing to retrace,
      // and the lead-in falls back to the plain drop it used to be.
      const stageH = stageEl?.getBoundingClientRect().height ?? 0;

      // `d` is px below the exit, so the whole hand-off is written in the one
      // coordinate both renderers already agree about.
      const sample = (d: number) =>
        left +
        bundleAt(1, stageH + d, startRect.width, stageH, fraction, lean, 0, 1, BUNDLE_MERGE_FROM);

      if (stageH > 0) {
        for (let d = -LEAD_IN; d < STUB; d += LEAD_STEP) {
          lead.push({ x: sample(d), y: exitY + d });
        }

        // Measured off the curve rather than taken from the constant that
        // produced it: this is the tangent of whatever the canvas actually drew,
        // and if that ever stops being a straight run-out it will still be.
        const tip = sample(STUB);
        enter = (tip - sample(STUB - LEAD_STEP)) / LEAD_STEP;
        points.push({ x: tip, y: exitY + STUB, bow: 0 });
      } else {
        lead.push({ x: exit, y: exitY - LEAD_IN });
        points.push({ x: exit, y: exitY + STUB, bow: 0 });
      }
    }

    // The cable used to alternate sides, with a lean limit to refuse a crossing
    // the section was too short to pay for. That guard was the thing that drew
    // the worst diagonal on the page: refusing the crossing left the node on
    // the side the cable was already assigned to, which on a wide viewport was
    // the far side — a thousand px sideways over four hundred px of fall, ruled
    // straight through the running text it existed to protect.
    //
    // There is no side to choose now. Every node sits in the one column of the
    // grid nothing is ever set in, which is where the hero already aims its
    // exit, so the cable is a single run down the page and the text column is
    // never crossed because the cable is never on the other side of it.
    const lane = laneAt(rect.left, compact ? centre - swing : width * WIRE.exit, compact);
    const bowMax = Math.min(BOW_MAX, lane.room * BOW_OF_LANE);
    // Only where there is room for one. Below about 1600px the reserved lane is
    // all the room there is, and a label opening into it is a label opening
    // over the page's own left edge.
    const label_side: Node["label_side"] = lane.x > 150 ? "left" : "right";

    let last: { x: number; y: number } = points[points.length - 1] ?? { x: lane.x, y: 0 };

    // How far the run arriving at a point swings out, alternating side by side
    // so the cable reads as a hanging line rather than as a rule ruled down the
    // page, and proportional to the run's own length so a short one is not bent
    // as hard as a long one. The landing takes it as well as the nodes do: it is
    // the end of a run like any other, and the only reason it was ever straight
    // is that it used to be 30px below a node.
    const bowFrom = (index: number, y: number) =>
      (index % 2 === 0 ? -1 : 1) * Math.min(bowMax, (y - last.y) * BOW_RATE);

    const found: Node[] = [];
    STOPS.forEach((id, index) => {
      const section = document.getElementById(id);
      if (!section) return;
      const box = section.getBoundingClientRect();
      // Beside the section's heading rather than at its very top edge, which
      // on a tall section would leave the node stranded in the gap above it.
      const y = box.top + window.scrollY - top + Math.min(box.height * 0.5, 128);

      // The hero's crossing lands here rather than at the first node — see
      // `HERO_ARRIVAL`. Only ahead of the first stop, and only where there is
      // a hero to have come out of.
      if (index === 0 && exitY > 0) {
        const clearEl = document.querySelector<HTMLElement>("[data-cable-clear]");
        const clearBox = clearEl?.getBoundingClientRect();
        // The height the crossing has to be past the type by, and how far left
        // of it. Absent, there is nothing under the hero to be clear of and the
        // crossing takes the whole depth it wants.
        const ruleY = clearBox ? clearBox.top + window.scrollY - top : 0;
        // Cleared by the same distance the lane keeps off the type, so the
        // crossing under the hero answers to the width the window actually has.
        const clearance = compact ? CLEAR_COMPACT : CLEAR;
        const ruleX = clearBox ? clearBox.left - rect.left - clearance : 0;

        const from = last;
        const sweep = (at: number) =>
          sweepInto(from, { x: lane.x, y: at }, enter, HERO_LEAD, HERO_SETTLE);

        // Where the run is when it passes the rule, read off the curve itself
        // and interpolated between the two samples either side of that height.
        // A crossing that never gets there is clear by not being there.
        const clears = (at: number) => {
          const run = sweep(at);
          for (let i = 0; i < run.length; i += 1) {
            const point = run[i];
            if (point.y < ruleY) continue;
            const back = run[i - 1] ?? from;
            const span = point.y - back.y;
            const t = span <= 0 ? 0 : (ruleY - back.y) / span;
            return back.x + (point.x - back.x) * t <= ruleX;
          }
          return true;
        };

        const wanted = from.y + (y - from.y) * HERO_ARRIVAL;
        // Finished above the rule, which is what the crossing used to be held
        // to: always clear, and the shallowest thing worth falling back to.
        const safe = clearBox ? Math.min(wanted, ruleY - HERO_CLEARANCE) : wanted;

        let arrival = wanted;
        if (clearBox && wanted > safe && !clears(wanted)) {
          let shallow = safe;
          let deep = wanted;
          for (let i = 0; i < 8; i += 1) {
            const mid = (shallow + deep) / 2;
            if (clears(mid)) shallow = mid;
            else deep = mid;
          }
          arrival = shallow;
        }

        // Refused rather than forced if the room is not there: a crossing given
        // no height at all is a horizontal rule across the page, which is worse
        // than the diagonal this exists to replace.
        //
        // Pushed as samples rather than as an anchor: this run is a curve of its
        // own, and interpolating between its ends with `swingBetween` would
        // throw away both of the tangents that make it one.
        if (arrival > from.y + HERO_CLEARANCE) {
          for (const point of sweep(arrival)) points.push({ ...point, bow: 0, raw: true });
          points.push({ x: lane.x, y: arrival, bow: 0, raw: true });
          last = { x: lane.x, y: arrival };
        }
      }

      const bow = bowFrom(index, y);

      points.push({ x: lane.x, y, bow });
      found.push({ id, label: dict.nav.sections[id], x: lane.x, y, label_side });
      last = { x: lane.x, y };
    });

    if (points.length + lead.length < 2) return;

    // The cable used to leave its lane here and run a loop around the card
    // rail. It cannot any more: the rail is pinned, so the cards stand still on
    // screen while the document — which is what this path is measured in — goes
    // on moving underneath them, and a loop drawn around where they used to be
    // is a loop around nothing. The section is a straight run now, like every
    // other one.
    const legs = STOPS.length;

    // And then it lands. A few px past the panel's edge, so the round cap of
    // every wire sits on the boundary rather than short of it — the last thing
    // the cable does is touch the thing it has been running towards.
    points.push({
      x: lane.x,
      y: panelTop + LAND,
      bow: bowFrom(legs, panelTop + LAND),
    });

    // The anchors are only where the cable has to be. What it does between
    // them is what stops it reading as a diagonal drawn across the text. The
    // lead-in goes in ahead of all of it, already resolved.
    //
    // Only the first run inherits a tangent, and only where the crossing was
    // refused: with one drawn, the point after the exit is already a sample of
    // it and there is no run to interpolate. Every run after that starts at a
    // node, where the cable is genuinely at rest sideways.
    const swung = [
      ...lead,
      ...points.flatMap((point, i) =>
        i === 0 || point.raw
          ? [point]
          : [...swingBetween(points[i - 1], point, point.bow, i === 1 ? enter : 0), point],
      ),
    ];

    // Tighter on a phone: at 360px wide, a rope two thirds the width of a
    // margin is a smudge rather than a bundle. The fan it ends in is held back
    // harder still — there is no margin for it to open into down there.
    //
    // And on any width, it may not open wider than the distance to the page's
    // own edge. The outermost wire is the one that travels furthest, and a fan
    // that opened past the window would not read as one: it would read as the
    // half of a fan that happened to fit.
    // Thinner on a phone than the fraction of the desktop bundle it used to be:
    // the lane it runs in is 40px wide, and half a bundle of the old width was
    // reaching the type on its own, whatever the core was doing.
    const spread = compact ? WIRE.strandSpread * 0.28 : WIRE.strandSpread;
    const flare = Math.min(
      compact ? WIRE.strandFlare * 0.35 : WIRE.strandFlare,
      lane.x / spread,
    );

    const woven = Array.from({ length: WIRE.strands }, (_, i) => {
      const lane = (i / (WIRE.strands - 1)) * 2 - 1;
      const outer = Math.abs(lane);
      const core = outer < 0.001;
      const seed = i * 1.7;

      const ribbon = createRibbon(swung.length);
      weave(swung, lane, spread, seed, WIRE.strandOpen, exitY, ribbon, panelTop, flare);

      // Seventeen strands graded only by distance from the core would be a
      // gradient with a bright line down the middle of it. The hash is what
      // makes it a rope: a weak strand next to a strong one, at no particular
      // distance from anything.
      const weight = 0.35 + hash2(i, 11) * 0.65;

      const strand: Strand = {
        d: ribbonPath(ribbon),
        // The core carries the weight; the rest are the fray around it, and
        // thin out the further from it they run.
        width: core ? WIRE.strokeCable : (0.4 + (1 - outer) * 0.5) * (0.7 + weight * 0.6),
        opacity: core ? 0.72 : (0.1 + (1 - outer) * 0.34) * weight,
        lane,
        seed,
        depth: strandDepth(lane, 0, 0, seed),
        lead: (hash2(i, 7) - 0.5) * 160,
        // Where this wire stops: the edge, all of them, on it. The raggedness a
        // stripped end wants is in how far each one has strayed sideways by the
        // time it gets there — see `WIRE.strandFlare` — and staggering the
        // heights as well only produced wires that never reached the thing they
        // were supposed to be landing on. The core needs no stop: the path
        // itself ends at the panel, so it has nowhere further to be drawn.
        stop: core ? Number.POSITIVE_INFINITY : panelTop + LAND,
        core,
      };

      return { strand, ribbon };
    });

    // Back to front. SVG has no depth of its own — the stack is the paint order
    // — so the order of the elements is the state the rope's twist is held in,
    // and the loop below re-sorts it as the reader scrolls. Sorted here too so
    // that a bundle nobody is animating is still a bundle rather than seventeen
    // strands stacked in the order they were built.
    woven.sort((a, b) => a.strand.depth - b.strand.depth);

    const built = woven.map((entry) => entry.strand);
    const ribbons = woven.map((entry) => entry.ribbon);

    loom.current = {
      base: swung,
      ribbons,
      openFrom: exitY,
      spread,
      flareAt: panelTop,
      flare,
      headStart: heroPinned() ? HEAD_START : 0,
    };

    // A refresh that changed nothing must not hand React a new array: the node
    // triggers are rebuilt from it, and rebuilding them on every resize tick
    // would be work for an identical result.
    const nodesKey = found.map((node) => `${node.id}:${node.x}:${node.y}`).join("|");
    if (nodesKey !== nodeKey.current) {
      nodeKey.current = nodesKey;
      setNodes(found);
    }

    // What the arrival turns on. Read ahead of the guard below, because the
    // panel can reflow — a validation message, a resized textarea — without
    // moving a single anchor of the cable.
    setPanelY(panelTop);

    const fill = panel?.querySelector<HTMLElement>("[data-panel-fill]");
    if (panel && fill) {
      const blocks = Array.from(panel.querySelectorAll<HTMLElement>("[data-tap]")).map((el) => ({
        el,
        at: el.getBoundingClientRect().top + window.scrollY - top - TAP_LEAD,
      }));
      const box = panel.getBoundingClientRect();

      // How far the tilt holds the right edge back, which is the panel's width
      // through `FILL_SKEW`. The element is grown by it (see
      // `[data-panel-fill]`) and travels by it, so the tilted edge still leaves
      // the panel covered corner to corner. Handed to CSS as well as kept here,
      // because this is the one place the width is measured and it is the only
      // thing about the tilt that is not a constant.
      const slant = box.width * Math.tan((FILL_SKEW * Math.PI) / 180);
      fill.style.setProperty("--fill-slant", `${slant}px`);

      terminus.current = {
        fill,
        at: panelTop,
        height: box.height,
        slant,
        blocks,
      };
      setTaps(blocks.length);
    } else {
      terminus.current = null;
      setTaps(0);
    }

    // Same for the bundle itself, which this measures on every resize tick and
    // on every ScrollTrigger refresh. Seventeen paths re-rendered to the
    // identical `d` would rebuild seventeen ribbons for nothing.
    const key = `${width}x${height}|${built.map((strand) => strand.d).join("|")}`;
    if (key === geometryKey.current) return;
    geometryKey.current = key;

    setSize({ w: width, h: height });
    setStartY(swung[0].y);
    setStrands(built);
  }, [dict.nav.sections]);

  // Measured after the browser has laid the page out, and again whenever
  // ScrollTrigger decides the page has changed shape — which already accounts
  // for the fonts landing and for the hero's pin spacer being inserted.
  useEffect(() => {
    measure();

    const onRefresh = () => measure();
    ScrollTrigger.addEventListener("refresh", onRefresh);

    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    if (layer.current) observer.observe(layer.current);

    return () => {
      ScrollTrigger.removeEventListener("refresh", onRefresh);
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measure]);

  // The `d` of every strand, joined: the dependency is the geometry itself, so
  // a refresh that produced the identical bundle does not rebuild the loom.
  const geometry = strands.map((strand) => strand.d).join("|");

  useGSAP(
    () => {
      if (geometry === "") return;
      const drawn = groups.current;
      const lines = paths.current;
      const woven = loom.current;
      const core = strands.findIndex((strand) => strand.core);
      if (lines.length === 0 || !woven) return;

      // Set here rather than in an effect of its own because `useGSAP` runs in
      // the layout phase: a passive effect setting the initial dash would run
      // after the branches below had already decided the final one, and under
      // reduced motion — where nothing re-sets it every frame — would leave the
      // bundle permanently undrawn.
      woven.ribbons.forEach((ribbon, i) => {
        const group = drawn[i];
        if (!group) return;
        group.style.strokeDasharray = `${ribbon.total}`;
        group.style.strokeDashoffset = `${ribbon.total}`;
      });

      // The panel's blocks are visible until something is in a position to
      // bring them in, which is the only arrangement where a measurement that
      // never happened leaves the contact form readable rather than blank.
      const end = terminus.current;
      end?.blocks.forEach((block) => block.el.setAttribute("data-lit", "false"));

      const mm = gsap.matchMedia();

      mm.add(MEDIA.anyMotion, () => {
        // The core is the one strand that is never rewoven, so it is the one
        // strand whose dash can be smoothed by a tween. Lenis is already easing
        // the scroll and the head of the stroke should trail it slightly.
        const coreGroup = drawn[core];
        const setCoreOffset = coreGroup
          ? gsap.quickTo(coreGroup, "strokeDashoffset", { duration: 0.35, ease: "power2.out" })
          : null;

        // How much of the core strand is drawn, in user units. The pulses ride
        // that one, so this is the only length worth keeping.
        let coreLength = 0;
        const y0 = woven.base[0]?.y ?? 0;

        // Half the strands are rewoven per frame, alternating, so each one
        // twists at 30fps while the bundle as a whole still answers the scroll
        // at 60. The drift is slow enough that no strand is ever more than a
        // frame stale, and it halves the only expensive thing here. The dash
        // still moves every frame for every strand — that costs nothing.
        let tick = 0;

        // How deep each strand currently is, and the stack that follows from
        // it. Kept as two reused arrays: this is a permutation of seventeen
        // integers recomputed a few times a second, not something worth
        // allocating for.
        const depths = new Float32Array(strands.length);
        const order = strands.map((_, i) => i);
        // Deliberately not a permutation, so the first pass always writes: a
        // rebuild leaves the elements in whatever order the last one sorted
        // them into, which is not the order React just rendered them in.
        const stacked = order.map(() => -1);

        const update = () => {
          const root = layer.current;
          if (!root) return;

          const top = root.getBoundingClientRect().top + window.scrollY;
          const ahead = window.innerHeight * EYE - top;
          const eye = window.scrollY + ahead;
          tick += 1;

          // Where a given strand has got to. Its own head is `lead` ahead of
          // the eye line, so this is the scroll at which that head reaches the
          // strand's stop — and past that the strand reads a scroll position
          // that no longer rises, which is what freezes a wire the moment it
          // lands. Infinite for the core, which never stops.
          const settled = (strand: Strand) =>
            Math.min(window.scrollY, strand.stop - strand.lead - ahead);

          // The rope's twist runs the length of the cable, so a strand is in
          // front of another at one height and behind it at the next. A stack
          // is one order for the whole page, and it is read off the one height
          // the reader is actually looking at — or, for a strand that has
          // landed, the last height it ever read.
          for (let i = 0; i < strands.length; i += 1) {
            const at = settled(strands[i]);
            depths[i] = strandDepth(
              strands[i].lane,
              at + ahead,
              at * WIRE.braidDrift,
              strands[i].seed,
            );
          }

          for (let i = 0; i < woven.ribbons.length; i += 1) {
            const group = drawn[i];
            const line = lines[i];
            const strand = strands[i];
            const ribbon = woven.ribbons[i];
            if (!group || !line || !strand) continue;

            // Everything but the core is rebuilt at this frame's phase. The
            // ribbon is overwritten in place and the dash length comes out of
            // the same pass, so a frame costs one path string per strand and
            // nothing else.
            //
            // Its depth is applied on the same beat. The core has none to
            // apply — it is the axis the others turn around — so it keeps the
            // weight it was built with.
            if (!strand.core && (i + tick) % 2 === 0) {
              weave(
                woven.base,
                strand.lane,
                woven.spread,
                strand.seed + settled(strand) * WIRE.braidDrift,
                WIRE.strandOpen,
                woven.openFrom,
                ribbon,
                woven.flareAt,
                woven.flare,
              );
              const d = ribbonPath(ribbon);
              line.setAttribute("d", d);
              group.style.strokeDasharray = `${ribbon.total}`;

              const depth = depths[i];
              const width = widthAt(strand, depth);
              line.style.strokeWidth = `${width}`;
              line.style.opacity = `${opacityAt(strand, depth)}`;

              const casing = casings.current[i];
              if (casing) {
                casing.setAttribute("d", d);
                casing.style.strokeWidth = `${width + CASING}`;
                casing.style.opacity = `${casingAt(depth)}`;
              }

              // The same line again, and the only reason it is a separate
              // element: the wires that open out the widest at the panel are
              // the outermost ones, which are the faintest things on the page —
              // a fan drawn in them is a fan nobody can see. This one is dark
              // over all of the page but the last stretch into the panel, where
              // it comes up to full and gives every wire the same weight as it
              // lands. Nothing to recompute: it is the string the wire above
              // already formatted.
              landings.current[i]?.setAttribute("d", d);
            }

            // Except at the very start, where the hero's pin has somewhere to
            // hide a head start — see `HEAD_START`, which is what `headStart`
            // is on a pinned hero and zero on one that is not.
            //
            // And it ends where it lands. Everything but the core is finished
            // at the panel's edge, so what runs on into the section is the one
            // wire the branches come off rather than a rope drawn over a
            // surface it has already arrived at.
            // The floor is the head start's, and only the head start's. Kept as
            // a floor with none to give, `y0` goes on holding the head at the
            // top of the run — and the ragged end (`lead`, up to ~90px of it)
            // is then drawn from there before the reader has scrolled at all,
            // which is the tuft of wire this was meant to be rid of.
            const target =
              (woven.headStart > 0 ? Math.max(eye, y0 + woven.headStart) : eye) + strand.lead;
            const length = ribbonLengthAt(ribbon, Math.min(target, strand.stop));

            if (strand.core) {
              coreLength = length;
              setCoreOffset?.(ribbon.total - length);
            } else {
              // No tween on these: they are being redrawn from scratch anyway,
              // and a tween chasing a dasharray that changed underneath it
              // would make the head stutter rather than trail.
              group.style.strokeDashoffset = `${ribbon.total - length}`;
            }
          }

          // The panel runs off the same scroll: the colour of the wire fills it
          // from the top, to wherever the reader has got to, and its blocks
          // arrive one at a time as they bring them up. Assembled by the scroll
          // rather than triggered by it, so taking the scroll back takes it
          // apart again.
          //
          // It starts where the wires land — the scroll at which the head line
          // reaches the panel's own top edge — and is full by the time that
          // edge has passed the bottom of the panel at `FILL_EYE`. Two scroll
          // positions rather than a rate, because the colour has to be caused
          // by the arrival at one end and finished before the page runs out of
          // scroll at the other, and those are the two things worth naming.
          //
          // The colour is moved rather than redrawn — one transform on one
          // element, no repaint of the largest box on the page — which is why
          // the element is a fade taller than the section and is positioned by
          // where its own soft edge has to land. The `skewY` is the tilt of
          // that edge and never changes; it rides along on the same string so
          // the transform stays a single declaration.
          if (end) {
            const lands = top + end.at - window.innerHeight * EYE;
            const full = top + end.at + end.height - window.innerHeight * FILL_EYE;
            const filled = clamp01((window.scrollY - lands) / Math.max(full - lands, 1));
            end.fill.style.transform = `translateY(${
              (filled - 1) * (end.height + FILL_FADE + end.slant)
            }px) skewY(${-FILL_SKEW}deg)`;

            for (const block of end.blocks) {
              block.el.setAttribute("data-lit", eye > block.at ? "true" : "false");
            }
          }

          if (tick % RESTACK_EVERY !== 0) return;

          // Back to front, so the strand nearest the reader is the last one
          // painted and the only one whose casing is not cut by somebody
          // else's. Touching the DOM only when the sort actually changed
          // something: two strands swapping is one reordering a second or so,
          // and re-appending seventeen nodes on every frame to discover they
          // were already in that order would be the most expensive thing here.
          order.sort((a, b) => depths[a] - depths[b]);

          let moved = false;
          for (let i = 0; i < order.length; i += 1) {
            if (order[i] !== stacked[i]) {
              moved = true;
              break;
            }
          }
          if (!moved) return;

          const parent = bundle.current;
          if (!parent) return;
          for (let i = 0; i < order.length; i += 1) {
            const group = drawn[order[i]];
            if (group) parent.appendChild(group);
            stacked[i] = order[i];
          }
        };

        const trigger = ScrollTrigger.create({
          trigger: layer.current ?? undefined,
          start: "top top",
          end: "bottom bottom",
          onUpdate: update,
          onRefresh: update,
        });
        update();

        // Data on the wire. Each pulse runs the core strand from the hero to
        // wherever it currently ends, so nothing travels down undrawn cable.
        const line = lines[core];
        const proxies = !line
          ? []
          : pulses.current.filter(Boolean).map((dot, index) => {
              const state = { t: index / WIRE.pulses };
              return gsap.to(state, {
                t: 1 + index / WIRE.pulses,
                duration: WIRE.pulseSeconds,
                ease: "none",
                repeat: -1,
                onUpdate: () => {
                  // Nothing on a cable that has not emerged yet. `coreLength`
                  // is a length, not a state: a few px of core exist as soon as
                  // the eye line is anywhere near the start of the run, and a
                  // pulse riding those px is a copper dot sitting on the hero
                  // with no wire under it — the cable fades up over `EMERGE`,
                  // so until there is that much of it there is nothing for
                  // anything to travel along. Never reached on a pinned hero,
                  // where the head start is `HEAD_START` and this is long past.
                  if (coreLength <= EMERGE) {
                    dot.style.opacity = "0";
                    return;
                  }
                  const t = state.t % 1;
                  const point = line.getPointAtLength(coreLength * t);
                  dot.setAttribute("cx", String(point.x));
                  dot.setAttribute("cy", String(point.y));
                  // Fades in at the tail and out at the head, so a pulse never
                  // appears or vanishes mid-cable.
                  dot.style.opacity = String(Math.sin(t * Math.PI) * 0.9);
                },
              });
            });

        return () => {
          trigger.kill();
          proxies.forEach((tween) => tween.kill());
        };
      });

      mm.add(MEDIA.motionReduced, () => {
        // The bundle is drawn, in full, and does nothing. The panel is lit and
        // every block is present, so the section is simply a section.
        for (const group of drawn) {
          if (group) group.style.strokeDashoffset = "0";
        }
        if (!end) return;
        end.fill.style.transform = `translateY(0px) skewY(${-FILL_SKEW}deg)`;
        for (const block of end.blocks) block.el.setAttribute("data-lit", "true");
      });

      return () => mm.revert();
    },
    // `revertOnUpdate`, because these dependencies change at runtime: every
    // resize and every ScrollTrigger refresh can produce a new bundle. Without
    // it @gsap/react only cleans up on unmount, so a re-run left the previous
    // scroll loop alive — two loops, each rewriting half the strands from its
    // own measurement of a page that had since moved, which showed up as half
    // the wires landing 30px past the panel they were cut at.
    { dependencies: [geometry, taps], revertOnUpdate: true },
  );

  // Lights the node whose section is being read.
  useGSAP(
    () => {
      if (nodes.length === 0) return;
      const triggers = nodes.map((node) => {
        const section = document.getElementById(node.id);
        const marker = document.querySelector<HTMLElement>(`[data-cable-node="${node.id}"]`);
        if (!section || !marker) return null;
        return ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => marker.setAttribute("data-active", String(self.isActive)),
        });
      });
      return () => triggers.forEach((trigger) => trigger?.kill());
    },
    { dependencies: [nodes], revertOnUpdate: true },
  );

  return (
    <div ref={layer} className="cable-layer" aria-hidden={geometry === "" ? "true" : undefined}>
      {geometry !== "" && (
        <>
          <svg
            width={size.w}
            height={size.h}
            viewBox={`0 0 ${size.w} ${size.h}`}
            fill="none"
            aria-hidden="true"
            className="absolute top-0 left-0"
          >
            <defs>
              {/* In user units, not percentages: the fade has to cover exactly
                  the band the canvas is fading out over, whatever the page ends
                  up being tall. Nothing changes at the far end — the cable never
                  reaches a surface that is not the page's own colour, because it
                  stops on the edge of the one that is not. */}
              <linearGradient
                id="cable-emerge"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1={startY}
                x2="0"
                y2={startY + EMERGE}
              >
                <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0" />
                <stop offset="0.55" stopColor="var(--color-accent)" stopOpacity="0.5" />
                <stop offset="1" stopColor="var(--color-accent)" stopOpacity="1" />
              </linearGradient>

              {/* What makes the stripped end readable. Absent over the whole
                  page and full only where the braid comes apart, so it costs
                  the rest of the cable nothing and the fan lands as sixteen
                  wires rather than as the outermost fray of a rope. */}
              <linearGradient
                id="cable-land"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1={panelY - WIRE.strandFlareSpan}
                x2="0"
                y2={panelY}
              >
                <stop offset="0" stopColor="var(--color-accent)" stopOpacity="0" />
                <stop offset="1" stopColor="var(--color-accent)" stopOpacity="1" />
              </linearGradient>

              {/* What a strand in front punches out of the strands behind it:
                  the page's own colour, over the whole run of the page that is
                  the page's own colour. It has to come up out of nothing over
                  the same band the wires do — a casing at full strength at the
                  seam would be cutting holes in the hero's canvas, which is
                  still drawing the same bundle underneath. */}
              <linearGradient
                id="cable-casing"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="0"
                y2={size.h}
              >
                <stop
                  offset={along(startY, size.h)}
                  stopColor="var(--color-paper)"
                  stopOpacity="0"
                />
                <stop
                  offset={along(startY + EMERGE, size.h)}
                  stopColor="var(--color-paper)"
                  stopOpacity="1"
                />
                <stop
                  offset={along(panelY - PANEL_FADE, size.h)}
                  stopColor="var(--color-paper)"
                  stopOpacity="1"
                />
                <stop
                  offset={along(panelY, size.h)}
                  stopColor="var(--color-paper)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {/* The strands live in a group of their own because the scroll
                loop re-sorts them: appending them into the svg itself would
                move them past the pulses, which have to stay on top. */}
            <g ref={bundle}>
              {strands.map((strand, i) => (
                // Dash and offset are set on the group; every stroke inside
                // inherits them, so neither the glow nor the casing can be
                // drawn ahead of its own wire.
                <g
                  key={i}
                  ref={(node) => {
                    groups.current[i] = node;
                  }}
                >
                  {strand.core && (
                    <path
                      d={strand.d}
                      stroke="url(#cable-emerge)"
                      strokeWidth={7}
                      strokeLinecap="round"
                      opacity={0.1}
                    />
                  )}
                  <path
                    ref={(node) => {
                      casings.current[i] = node;
                    }}
                    d={strand.d}
                    stroke="url(#cable-casing)"
                    strokeWidth={widthAt(strand, strand.depth) + CASING}
                    strokeLinecap="round"
                    opacity={casingAt(strand.depth)}
                  />
                  <path
                    ref={(node) => {
                      paths.current[i] = node;
                    }}
                    d={strand.d}
                    stroke="url(#cable-emerge)"
                    strokeWidth={widthAt(strand, strand.depth)}
                    strokeLinecap="round"
                    opacity={opacityAt(strand, strand.depth)}
                  />
                  {!strand.core && (
                    <path
                      ref={(node) => {
                        landings.current[i] = node;
                      }}
                      d={strand.d}
                      stroke="url(#cable-land)"
                      strokeWidth={1}
                      strokeLinecap="round"
                      opacity={0.8}
                    />
                  )}
                </g>
              ))}
            </g>

            {Array.from({ length: WIRE.pulses }, (_, i) => (
              <circle
                key={i}
                ref={(node) => {
                  if (node) pulses.current[i] = node;
                }}
                r={2.4}
                fill="var(--color-filament)"
                opacity={0}
              />
            ))}
          </svg>

          <nav aria-label={dict.nav.cableLabel}>
            {nodes.map((node) => (
              <a
                key={node.id}
                href={`#${node.id}`}
                data-cable-node={node.id}
                data-label={node.label_side}
                className="cable-node"
                style={{ left: node.x, top: node.y }}
                onClick={(event) => {
                  // Lenis owns the scroll position; letting the browser jump
                  // would desync every trigger on the page.
                  event.preventDefault();
                  scrollTo(`#${node.id}`);
                }}
              >
                <span aria-hidden="true" className="cable-node-dot" />
                <span className="cable-node-label">{node.label}</span>
              </a>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

/**
 * How a strand is drawn at a given depth.
 *
 * The stack decides who is on top of whom; these decide whether the reader
 * believes it. A wire coming towards them thickens and brightens, one going
 * behind the rope thins and dims, and only the ones actually in front cut a
 * casing — a strand at the back cutting one would be a strand erasing the rope
 * it is inside.
 *
 * Both are gentle: this is a 60px bundle of hairlines, and a strand that
 * doubled in weight as it came round the front would read as a strand being
 * animated rather than as a strand turning.
 */
function widthAt(strand: Strand, depth: number): number {
  return strand.width * (0.85 + 0.3 * front(depth));
}

function opacityAt(strand: Strand, depth: number): number {
  return strand.opacity * (0.7 + 0.6 * front(depth));
}

function casingAt(depth: number): number {
  const out = Math.max(0, depth);
  // Squared rather than linear, so the casing belongs to the few strands that
  // are genuinely at the front instead of hazing every strand past the middle.
  return out * out * CASING_MAX;
}

/** Depth as 0 (the back of the rope) to 1 (the front). */
function front(depth: number): number {
  return (depth + 1) / 2;
}

/** A y in layer coordinates as a gradient stop offset. */
function along(y: number, height: number): number {
  if (height <= 0) return 0;
  return Math.min(1, Math.max(0, y / height));
}

/**
 * Where the cable runs, read off the room the layout reserved for it.
 *
 * `--cable-lane` is left padding on every container; this measures where that
 * padding put the type and comes back just clear of it. Measured rather than
 * recomputed from the token, so it stays right across the breakpoint that
 * changes the gutter, and right if the container is ever given a different
 * maximum width.
 *
 * It takes a fraction of that room rather than a fixed distance off the type:
 * the wider the window, the further out into the margin the cable goes, instead
 * of trailing the first character of every line at arm's length wherever the
 * line happens to start. What it will not do is centre itself in the room — at
 * `LANE_BIAS` it is still nearer the edge than the text, so it reads as the
 * page's own left margin and not as a second column.
 *
 * `compact` is the phone's lane, which is a fifth of the width and cannot carry
 * the floors the rest of this is written in — see `CLEAR_COMPACT`. It is a
 * branch rather than a scaled constant on purpose: the desktop arithmetic below
 * is the arithmetic it has always been, to the pixel.
 */
function laneAt(layerLeft: number, fallback: number, compact: boolean): Lane {
  const shell = document.querySelector<HTMLElement>(".shell");
  if (!shell) return { x: fallback, room: CLEAR };

  const box = shell.getBoundingClientRect();
  const padding = Number.parseFloat(getComputedStyle(shell).paddingLeft);
  if (Number.isNaN(padding)) return { x: fallback, room: CLEAR };

  // Everything to the left of the first character of a line.
  const type = box.left - layerLeft + padding;

  if (compact) {
    const x = Math.max(EDGE_COMPACT, Math.min(type * LANE_BIAS, type - CLEAR_COMPACT));
    // The one floor that is not carried over. On a wide window insisting on a
    // minimum swing costs margin nobody is using; here it would be spent on the
    // column, which is the whole of what this fix is about. What the lane has is
    // what the cable gets, and where that is very little the run is very nearly
    // straight — which is what a 40px margin can honestly hold.
    return { x, room: Math.max(0, Math.min(x - EDGE_COMPACT * 0.5, type - x)) };
  }

  const x = Math.max(EDGE, Math.min(type * LANE_BIAS, type - CLEAR));

  // The swing is bounded by whichever side has less to give — and never by so
  // little that the serpentine flattens into the rule it exists not to be.
  return { x, room: Math.max(CLEAR, Math.min(x - EDGE * 0.5, type - x)) };
}
