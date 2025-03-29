/**
 * @file gradients/interpolation.ts
 * Handles color interpolation logic for gradients.
 */
import chroma from "chroma-js";
import type { IColor } from "../core/color.types";
import { fromIColor, toIColor } from "../core/conversions";

/**
 * Interpolates between two colors using chroma.js's mix function.
 *
 * @param startColor - The starting IColor.
 * @param endColor - The ending IColor.
 * @param t - The interpolation factor (0.0 to 1.0). 0 returns startColor, 1 returns endColor.
 * @param mode - The color space for interpolation ('lab', 'lch', 'rgb', etc.). Defaults to 'lch'.
 * @returns The interpolated IColor.
 *
 * @example
 * const red = toIColor('red');
 * const blue = toIColor('blue');
 * const midPoint = interpolateColor(red, blue, 0.5, 'lab'); // Get the perceptual midpoint
 */
export function interpolateColor(
  startColor: IColor,
  endColor: IColor,
  t: number,
  mode: "rgb" | "lab" | "hsl" | "lch" | "lrgb" | "oklab" = "lch", // Default to LCH for gradients
): IColor {
  // Clamp t to the valid range [0, 1]
  const ratio = Math.max(0, Math.min(1, t));

  // Use chroma.mix for interpolation
  // Note: chroma-js v2+ handles oklab interpolation directly if available
  const mixedChroma = chroma.mix(
    fromIColor(startColor),
    fromIColor(endColor),
    ratio,
    mode,
  );

  // Handle alpha interpolation - average the alphas
  const startAlpha = startColor.alpha ?? 1;
  const endAlpha = endColor.alpha ?? 1;
  const interpolatedAlpha = startAlpha + (endAlpha - startAlpha) * ratio;

  return toIColor(mixedChroma.alpha(interpolatedAlpha));
}

/**
 * Interpolates hue correctly, handling the circular nature (0-360 degrees).
 * Finds the shortest path around the color wheel.
 *
 * @param h1 - Starting hue (0-360).
 * @param h2 - Ending hue (0-360).
 * @param t - Interpolation factor (0.0 to 1.0).
 * @returns The interpolated hue (0-360).
 *
 * @example
 * const hue1 = 350; // Reddish
 * const hue2 = 20;  // Orangeish
 * const midHue = interpolateHue(hue1, hue2, 0.5); // Should be around 5 (passing through 0/360)
 */
export function interpolateHue(h1: number, h2: number, t: number): number {
  const d = h2 - h1;
  let delta: number;

  if (d > 180) {
    delta = d - 360; // Go counter-clockwise (shorter path)
  } else if (d < -180) {
    delta = d + 360; // Go clockwise (shorter path)
  } else {
    delta = d; // Normal path
  }

  const interpolated = (h1 + delta * t) % 360;
  // Ensure positive result if it goes negative
  return interpolated < 0 ? interpolated + 360 : interpolated;
}

// Note: The original `advanced-generator.ts` had more complex interpolation modes
// like 'polynomial' and 'exponential'. These can be added here if needed, modifying 't'
// before passing it to `interpolateColor`. For example:
/*
function applyInterpolationMode(t: number, mode: 'linear' | 'polynomial' | 'exponential'): number {
    switch (mode) {
        case 'polynomial': return t * t; // Example: quadratic ease-in
        case 'exponential': return Math.pow(t, 3); // Example: cubic ease-in
        case 'linear':
        default: return t;
    }
}
*/
// Then `interpolateColor` could optionally accept a modified `t`.
// However, chroma's built-in modes ('lab', 'lch', 'bezier') often provide better perceptual results.
