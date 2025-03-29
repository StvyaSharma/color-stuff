/**
 * @file color-operations.ts
 * Core color operations, conversions, and advanced manipulations.
 */

import chroma, { Color } from "chroma-js";

/**
 * Interface representing a color in different formats.
 */
export interface IColor {
  hex: string;
  rgb: [number, number, number];
  lab?: [number, number, number]; // CIELAB L*, a*, b*
  oklab?: [number, number, number]; // OkLab L, a, b
  alpha?: number; // Alpha channel (0-1)
}

/**
 * Convert a color (in hex, rgb, etc.) to an IColor interface object.
 * This extracts hex, RGB, Lab, and optionally OkLab.
 *
 * @param input - Any valid chroma-js input (hex, rgb array, etc.)
 * @returns An IColor object
 */
export function toIColor(
  input: string | Color | [number, number, number] | number[] | RGB, // Added number[] and RGB interface
): IColor {
  let c: Color;
  if (typeof input === "string") {
    c = chroma(input);
  } else if (Array.isArray(input) && input.length === 3) {
    // Ensure array has 3 numbers for RGB
    c = chroma(input[0], input[1], input[2]);
  } else if (
    typeof input === "object" && "r" in input && "g" in input && "b" in input
  ) {
    // Handle RGB object input
    c = chroma((input as RGB).r, (input as RGB).g, (input as RGB).b);
  } else if (input instanceof Color) {
    // Handle chroma.Color instance input
    c = input;
  } else {
    // Attempt to parse other inputs, fallback or throw error
    try {
      c = chroma(input as any); // Let chroma try to parse
    } catch (e) {
      console.error("Failed to parse input to IColor:", input, e);
      // Fallback to a default color like black or throw an error
      c = chroma("black");
      // throw new Error(`Invalid input type for toIColor: ${typeof input}`);
    }
  }

  const rgb = c.rgb() as [number, number, number];
  const lab = c.lab() as [number, number, number];
  const hex = c.hex();
  const alpha = c.alpha();

  // --- OkLab Calculation (using official conversion logic) ---
  // Convert sRGB components to linear sRGB
  const r_linear = srgbToLinear(rgb[0]);
  const g_linear = srgbToLinear(rgb[1]);
  const b_linear = srgbToLinear(rgb[2]);

  // Convert linear RGB to LMS space
  const l = 0.4121656120 * r_linear + 0.5362752080 * g_linear +
    0.0514575653 * b_linear;
  const m = 0.2118591070 * r_linear + 0.6807189584 * g_linear +
    0.1074065790 * b_linear;
  const s = 0.0883097947 * r_linear + 0.2818474174 * g_linear +
    0.6298046759 * b_linear;

  // Non-linear transformation: cube root of LMS components.
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // Convert to OkLab
  const oklab: [number, number, number] = [
    0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_, // L
    1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_, // a
    0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_, // b
  ];
  // --- End OkLab Calculation ---

  return {
    hex,
    rgb,
    lab,
    oklab,
    alpha,
  };
}

/**
 * Helper function: Convert sRGB component (0-255) to linear value (0-1).
 */
function srgbToLinear(component: number): number {
  const c = component / 255.0;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts an IColor to a Chroma color instance.
 *
 * @param color - IColor object.
 * @returns Chroma.Color instance
 */
export function fromIColor(color: IColor): Color {
  // Create from RGB and set alpha
  return chroma(color.rgb).alpha(color.alpha ?? 1);
}

/**
 * Adjust a color's brightness (luminance). Positive values lighten, negative values darken.
 * Operates in Lab space for better perceptual results.
 *
 * @param color - The original color as IColor.
 * @param amount - Brightness adjustment factor for L* channel (-100 to 100 is typical range).
 * @returns A modified IColor with new brightness.
 */
export function adjustBrightness(color: IColor, amount: number): IColor {
  const c = fromIColor(color);
  const lab = c.lab();
  // Adjust L* channel, clamping between 0 and 100
  const newL = Math.max(0, Math.min(100, lab[0] + amount));
  const adjustedColor = chroma.lab(newL, lab[1], lab[2]);
  return toIColor(adjustedColor);
}

/**
 * Basic color difference measure using deltaE (CIE76 - Euclidean distance in Lab).
 * For more accurate perceptual difference, use chroma.deltaE which implements CIEDE2000.
 *
 * @param colorA - First color IColor
 * @param colorB - Second color IColor
 * @returns Numeric measure of difference (lower is more similar).
 */
export function colorDifference(colorA: IColor, colorB: IColor): number {
  // Ensure lab values exist, fallback to [0,0,0] if not (shouldn't happen with toIColor)
  const labA = colorA.lab ?? [0, 0, 0];
  const labB = colorB.lab ?? [0, 0, 0];
  const deltaL = labA[0] - labB[0];
  const deltaA = labA[1] - labB[1];
  const deltaB = labA[2] - labB[2];
  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Interface representing an RGB color. Used internally and for input flexibility.
 */
export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}
