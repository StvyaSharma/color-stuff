/**
 * @file colorOperations.ts
 * Core color operations, conversions, and advanced manipulations.
 */

import chroma, { Color } from "chroma-js";

/**
 * Interface representing a color in different formats.
 */
export interface IColor {
  hex: string;
  rgb: [number, number, number];
  lab?: [number, number, number];
  oklab?: [number, number, number];
  alpha?: number;
}

/**
 * Convert a color (in hex, rgb, etc.) to an IColor interface object.
 * This extracts hex, RGB, Lab, and optionally OkLab.
 *
 * @param input - Any valid chroma-js input (hex, rgb array, etc.)
 * @returns An IColor object
 */
export function toIColor(
  input: string | Color | [number, number, number],
): IColor {
  let c: Color;
  if (typeof input === "string") {
    c = chroma(input);
  } else if (Array.isArray(input)) {
    c = chroma(input[0], input[1], input[2]);
  } else {
    c = input;
  }
  const rgb = c.rgb() as [number, number, number];
  const lab = c.lab() as [number, number, number];
  const hex = c.hex();
  const alpha = c.alpha();

  // For OkLab, we can approximate using built-in lab or rely on external conversions.
  // Chroma.js doesn't natively do OkLab, so you could either extend chroma or approximate here.
  // Below is a simple stub that maps Lab → OkLab in a naive manner.
  // For a proper OkLab, you would need a dedicated conversion.

  // Placeholder: naive approach simulating OkLab
  const oklab: [number, number, number] = [
    lab[0] / 100,
    lab[1] / 128,
    lab[2] / 128,
  ];

  return {
    hex,
    rgb,
    lab,
    oklab,
    alpha,
  };
}

/**
 * Converts an IColor to a Chroma color instance.
 *
 * @param color - IColor object.
 * @returns Chroma.Color instance
 */
export function fromIColor(color: IColor): Color {
  // By default, we create from RGB
  return chroma(color.rgb).alpha(color.alpha ?? 1);
}

/**
 * Adjust a color's brightness. Positive values lighten, negative values darken.
 *
 * @param color - The original color as IColor.
 * @param amount - Brightness adjustment (-1.0 to 1.0).
 * @returns A modified IColor with new brightness.
 */
export function adjustBrightness(color: IColor, amount: number): IColor {
  const c = fromIColor(color).luminance(
    Math.min(Math.max(0, fromIColor(color).luminance() + amount), 1),
  );
  return toIColor(c);
}

/**
 * Basic color difference measure using deltaE (CIE76).
 * For advanced usage, consider deltaE2000 from a separate library.
 *
 * @param colorA - First color IColor
 * @param colorB - Second color IColor
 * @returns Numeric measure of difference (lower is more similar).
 */
export function colorDifference(colorA: IColor, colorB: IColor): number {
  const labA = colorA.lab ?? [0, 0, 0];
  const labB = colorB.lab ?? [0, 0, 0];
  return Math.sqrt(
    Math.pow(labA[0] - labB[0], 2) +
      Math.pow(labA[1] - labB[1], 2) +
      Math.pow(labA[2] - labB[2], 2),
  );
}
