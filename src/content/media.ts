/**
 * Image assets.
 *
 * The portrait is a cut-out on transparency, which is not a detail: the hero
 * composition puts the name behind it, and the canvas that takes it apart uses
 * the alpha channel to know where the body ends. Replacing it with a
 * rectangular photograph breaks both.
 *
 * Truecolour alpha specifically — a *paletted* PNG carries its transparency in
 * a `tRNS` chunk instead of a real channel, and the cut-out arrives as a black
 * rectangle. Normalise a new export before dropping it in:
 *   python3 -c "from PIL import Image; \
 *     Image.open('in.png').convert('RGBA').save('public/eu.png', optimize=True)"
 */

export type ImageAsset = {
  src: string;
  width: number;
  height: number;
};

export const PORTRAIT: ImageAsset = {
  src: "/imagem-eu.png",
  width: 1101,
  height: 1429,
};

/**
 * The same picture at sampling resolution. The hero reads it pixel by pixel to
 * build the particle field, and reading a 1422px-wide PNG for a few thousand
 * samples would cost far more than it returns. Generated with:
 *   convert public/eu.png -resize 480x -strip -quality 78 public/eu-sample.webp
 * Regenerate it whenever the portrait changes, or the filaments will carry the
 * colours of the old photograph.
 */
export const PORTRAIT_SAMPLE: ImageAsset = {
  src: "/imagem-eu-sample.webp",
  width: 480,
  height: 623,
};
