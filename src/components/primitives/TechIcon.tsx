import { ICON_PATHS, type IconName } from "@/content/icons";

/**
 * A technology mark, in the colour of whatever it is set beside.
 *
 * `fill="currentColor"` and no other colour anywhere: the mark inherits the
 * scheme, so it flips with the theme toggle for free and can never be the one
 * thing on a near-black page still wearing a brand's blue.
 *
 * Sized in `em` rather than px, so it scales with the type it belongs to
 * instead of being a fixed dot beside a heading that is fluid.
 */
export function TechIcon({ name }: { name: IconName }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-[0.62em] w-[0.62em] shrink-0"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
