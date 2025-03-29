/**
 * @file accessibility/validation.ts
 * Provides functions for validating palette-wide accessibility and auto-adjusting colors.
 */

import type { IColor, Palette } from "../core/color.types.ts";
import { getContrastRatio, meetsContrastGuidelines } from "./contrast.ts";
import { fromIColor, toIColor } from "../core/conversions.ts";
import { clamp } from "../utils/math.ts";

/**
 * Validates an entire palette for contrast accessibility between all pairs of colors.
 * Returns a matrix where results[i][j] is true if palette[i] (as foreground)
 * meets the contrast guideline against palette[j] (as background).
 *
 * @param palette - An array of IColor objects.
 * @param level - The target WCAG level ("AA" or "AAA") for normal text contrast. Defaults to "AA".
 * @returns A 2D boolean array representing the contrast compliance matrix.
 *
 * @example
 * const myPalette = [toIColor('white'), toIColor('black'), toIColor('gray')];
 * const resultsAA = validatePaletteAccessibility(myPalette, 'AA');
 * // resultsAA[0][1] (white on black) will likely be true
 * // resultsAA[0][2] (white on gray) might be false for AA
 */
export function validatePaletteAccessibility(
  palette: Palette,
  level: "AA" | "AAA" = "AA",
): boolean[][] {
  const numColors = palette.length;
  const results: boolean[][] = Array(numColors).fill(0).map(() =>
    Array(numColors).fill(false)
  );

  for (let i = 0; i < numColors; i++) {
    for (let j = 0; j < numColors; j++) {
      // Don't compare a color against itself
      if (i === j) {
        results[i][j] = true; // Or false, depending on interpretation - let's say true.
        continue;
      }
      results[i][j] = meetsContrastGuidelines(palette[i], palette[j], level);
    }
  }
  return results;
}

/**
 * Attempts to automatically adjust a foreground color to meet contrast guidelines
 * against a fixed background color by iteratively adjusting its luminance.
 *
 * @param fgColor - The foreground IColor to adjust.
 * @param bgColor - The background IColor to compare against.
 * @param level - The target WCAG level ("AA" or "AAA"). Defaults to "AA".
 * @param maxAttempts - The maximum number of iterations to try adjusting luminance. Defaults to 20.
 * @param step - The amount to change luminance per step (0 to 1). Defaults to 0.05.
 * @returns The adjusted IColor that meets the guideline, or the original fgColor if adjustment fails within maxAttempts.
 *
 * @example
 * const lightGray = toIColor('#cccccc');
 * const white = toIColor('white');
 * const adjustedGray = autoAdjustForAccessibility(lightGray, white, 'AA');
 * // adjustedGray will be darker than lightGray to meet contrast with white.
 * console.log(adjustedGray.hex);
 */
export function autoAdjustForAccessibility(
  fgColor: IColor,
  bgColor: IColor,
  level: "AA" | "AAA" = "AA",
  maxAttempts: number = 20,
  step: number = 0.05,
): IColor {
  const requiredRatio = level === "AA" ? 4.5 : 7.0;

  if (getContrastRatio(fgColor, bgColor) >= requiredRatio) {
    return fgColor; // Already meets the guideline
  }

  let adjustedColor = fromIColor(fgColor);
  const bgLuminance = fromIColor(bgColor).luminance();
  let attempts = 0;

  // Determine initial direction: lighten or darken foreground
  // If fg is darker than bg, try lightening; if fg is lighter, try darkening.
  const initialFgLuminance = adjustedColor.luminance();
  const direction = initialFgLuminance < bgLuminance ? step : -step; // +step to lighten, -step to darken

  while (attempts < maxAttempts) {
    const currentLuminance = adjustedColor.luminance();
    // Calculate the next luminance, clamping between 0 and 1
    const nextLuminance = clamp(currentLuminance + direction, 0, 1);

    // If we hit the boundary (0 or 1) and still haven't met the ratio, we might be stuck
    if (
      nextLuminance === currentLuminance &&
      getContrastRatio(toIColor(adjustedColor), bgColor) < requiredRatio
    ) {
      // console.warn(`Auto-adjust hit luminance boundary for ${fgColor.hex} against ${bgColor.hex} without meeting ratio.`);
      // Consider trying the opposite direction once? Or just return original. Let's return original for now.
      return fgColor;
    }

    // Apply the new luminance
    try {
      // Setting luminance can sometimes push colors out of gamut, chroma handles this
      adjustedColor = adjustedColor.luminance(nextLuminance);
    } catch (e) {
      // If setting luminance fails (e.g., edge cases with chroma-js), stop trying
      console.error("Error setting luminance during auto-adjustment:", e);
      return fgColor;
    }

    // Check if the new color meets the contrast ratio
    if (getContrastRatio(toIColor(adjustedColor), bgColor) >= requiredRatio) {
      return toIColor(adjustedColor); // Success!
    }

    attempts++;
  }

  // If maxAttempts reached without success
  // console.warn(`Could not meet contrast level ${level} for ${fgColor.hex} against ${bgColor.hex} within ${maxAttempts} attempts.`);
  return fgColor; // Fallback to the original color
}
