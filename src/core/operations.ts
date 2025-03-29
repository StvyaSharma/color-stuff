/**
 * @file core/operations.ts
 * Provides core color manipulation functions operating on the IColor interface.
 */

import chroma from "chroma-js";
import type { IColor } from "./color.types.ts";
import { fromIColor, toIColor } from "./conversions.ts";

/**
 * Adjusts a color's brightness (luminance) in Lab space for better perceptual results.
 * Positive amounts lighten, negative amounts darken.
 *
 * @param color - The base IColor object.
 * @param amount - The amount to adjust lightness L* by (e.g., 10 to lighten, -10 to darken). Typical range might be -100 to 100, but Lab L* is clamped 0-100.
 * @returns A new IColor object with adjusted brightness.
 *
 * @example
 * const brightRed = adjustBrightness(toIColor('red'), 10);
 * const darkBlue = adjustBrightness(toIColor('blue'), -20);
 */
export function adjustBrightness(color: IColor, amount: number): IColor {
  const c = fromIColor(color);
  const lab = c.lab(); // [L*, a*, b*]

  // Adjust L* channel, clamping between 0 and 100
  const newL = Math.max(0, Math.min(100, lab[0] + amount));

  // Create new color from adjusted Lab values
  const adjustedColor = chroma.lab(newL, lab[1], lab[2]);

  // Return as IColor, preserving original alpha
  return toIColor(adjustedColor.alpha(color.alpha));
}

/**
 * Adjusts a color's saturation in HSL space.
 * Positive amounts increase saturation, negative amounts decrease it.
 *
 * @param color - The base IColor object.
 * @param amount - The percentage points to adjust saturation by (e.g., 20 to increase, -20 to decrease). Clamped 0-100.
 * @returns A new IColor object with adjusted saturation.
 *
 * @example
 * const moreSaturatedGreen = adjustSaturation(toIColor('lime'), 20);
 * const lessSaturatedOrange = adjustSaturation(toIColor('orange'), -30);
 */
export function adjustSaturation(color: IColor, amount: number): IColor {
  const c = fromIColor(color);
  const hsl = c.hsl(); // [h, s, l] - s and l are 0-1

  // Adjust saturation 's', clamping between 0 and 1
  const newS = Math.max(0, Math.min(1, hsl[1] + amount / 100));

  // Create new color from adjusted HSL values
  // Handle NaN hue (for grays)
  const hue = isNaN(hsl[0]) ? 0 : hsl[0];
  const adjustedColor = chroma.hsl(hue, newS, hsl[2]);

  // Return as IColor, preserving original alpha
  return toIColor(adjustedColor.alpha(color.alpha));
}

/**
 * Rotates the hue of a color.
 *
 * @param color - The base IColor object.
 * @param degrees - The angle (in degrees) to rotate the hue by. Positive values rotate clockwise, negative values counter-clockwise.
 * @returns A new IColor object with rotated hue.
 *
 * @example
 * const green = rotateHue(toIColor('yellow'), 60); // Yellow -> Greenish
 */
export function rotateHue(color: IColor, degrees: number): IColor {
  const c = fromIColor(color);
  const currentHue = c.hsl()[0]; // Get hue from HSL

  // If hue is NaN (e.g., for black/white/gray), rotation has no effect
  if (isNaN(currentHue)) {
    return color;
  }

  // Calculate new hue, ensuring it wraps around 0-360
  const newHue = (currentHue + degrees % 360 + 360) % 360;

  // Set the new hue using chroma's set method
  const adjustedColor = c.set("hsl.h", newHue);

  // Return as IColor, preserving original alpha
  return toIColor(adjustedColor.alpha(color.alpha));
}

/**
 * Calculates the perceptual color difference between two colors using the deltaE (CIEDE2000) formula.
 * Lower values indicate more similar colors. A difference of ~1.0 is considered the threshold of perceptible difference.
 *
 * @param colorA - The first IColor object.
 * @param colorB - The second IColor object.
 * @returns The CIEDE2000 color difference value.
 *
 * @example
 * const color1 = toIColor("#ff0000");
 * const color2 = toIColor("#fe0000"); // Very similar red
 * const difference = colorDifference(color1, color2); // Should be a small number
 */
export function colorDifference(colorA: IColor, colorB: IColor): number {
  // chroma.deltaE uses CIEDE2000 by default and operates on chroma objects
  return chroma.deltaE(fromIColor(colorA), fromIColor(colorB));
}

/**
 * Mixes two colors in a specified color space.
 *
 * @param colorA - The first IColor object.
 * @param colorB - The second IColor object.
 * @param ratio - The mixing ratio (0-1). 0 gives colorA, 1 gives colorB, 0.5 gives an equal mix. Defaults to 0.5.
 * @param mode - The color space for interpolation ('rgb', 'lab', 'hsl', 'lch', etc.). Defaults to 'lab' for perceptually smoother results.
 * @returns A new IColor object representing the mixed color.
 *
 * @example
 * const red = toIColor("red");
 * const blue = toIColor("blue");
 * const purple = mix(red, blue, 0.5, 'lab'); // Perceptually mixed purple
 * const orange = mix(red, toIColor("yellow"), 0.5, 'rgb'); // RGB mixed orange
 */
export function mix(
  colorA: IColor,
  colorB: IColor,
  ratio: number = 0.5,
  mode: "rgb" | "lab" | "hsl" | "lch" | "lrgb" = "lab",
): IColor {
  const mixedChroma = chroma.mix(
    fromIColor(colorA),
    fromIColor(colorB),
    ratio,
    mode,
  );
  // Ensure alpha is preserved or handled appropriately - chroma.mix might average alpha
  // Let's decide to take the alpha of colorA as default, or average them? Averaging seems reasonable.
  const avgAlpha = ((colorA.alpha ?? 1) + (colorB.alpha ?? 1)) / 2;
  return toIColor(mixedChroma.alpha(avgAlpha));
}
