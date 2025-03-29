/**
 * @file accessibility/contrast.ts
 * Implements WCAG 2.1 contrast checking functions.
 */

import type { IColor } from "../core/color.types.ts";
import { fromIColor } from "../core/conversions.ts";

/**
 * Calculates the relative luminance of a color according to WCAG 2.1 definition.
 *
 * @param color - The IColor object.
 * @returns The relative luminance (0.0 to 1.0).
 * @see https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * @example
 * const whiteLuminance = getRelativeLuminance(toIColor('white')); // ~1.0
 * const blackLuminance = getRelativeLuminance(toIColor('black')); // ~0.0
 */
export function getRelativeLuminance(color: IColor): number {
  // Use chroma-js's luminance calculation which aligns with WCAG
  return fromIColor(color).luminance();
}

/**
 * Calculates the contrast ratio between two colors according to WCAG 2.1 definition.
 *
 * @param fgColor - The foreground IColor object.
 * @param bgColor - The background IColor object.
 * @returns The contrast ratio (1.0 to 21.0).
 * @see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 *
 * @example
 * const contrast = getContrastRatio(toIColor('black'), toIColor('white')); // ~21.0
 */
export function getContrastRatio(fgColor: IColor, bgColor: IColor): number {
  const lum1 = getRelativeLuminance(fgColor);
  const lum2 = getRelativeLuminance(bgColor);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a foreground/background color pair meets WCAG 2.1 contrast guidelines
 * for normal text (AA or AAA level).
 *
 * - AA requires a ratio of 4.5:1
 * - AAA requires a ratio of 7.0:1
 *
 * @param fgColor - The foreground IColor object.
 * @param bgColor - The background IColor object.
 * @param level - The target WCAG level ("AA" or "AAA"). Defaults to "AA".
 * @returns True if the contrast meets or exceeds the required ratio for the specified level, false otherwise.
 * @see https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * @example
 * const meetsAA = meetsContrastGuidelines(toIColor('navy'), toIColor('white'), 'AA'); // true
 * const meetsAAA = meetsContrastGuidelines(toIColor('gray'), toIColor('white'), 'AAA'); // false
 */
export function meetsContrastGuidelines(
  fgColor: IColor,
  bgColor: IColor,
  level: "AA" | "AAA" = "AA",
): boolean {
  const ratio = getContrastRatio(fgColor, bgColor);
  const requiredRatio = level === "AA" ? 4.5 : 7.0;
  return ratio >= requiredRatio;
}

/**
 * Checks if a foreground/background color pair meets WCAG 2.1 contrast guidelines
 * for large text (AA or AAA level).
 *
 * Large text is defined as 18 point (typically 24px) or 14 point (typically 18.66px) bold.
 * - AA requires a ratio of 3.0:1
 * - AAA requires a ratio of 4.5:1
 *
 * @param fgColor - The foreground IColor object.
 * @param bgColor - The background IColor object.
 * @param level - The target WCAG level ("AA" or "AAA"). Defaults to "AA".
 * @returns True if the contrast meets or exceeds the required ratio for the specified level for large text, false otherwise.
 * @see https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * @example
 * const meetsAALarge = meetsLargeTextContrastGuidelines(toIColor('gray'), toIColor('white'), 'AA'); // true
 */
export function meetsLargeTextContrastGuidelines(
  fgColor: IColor,
  bgColor: IColor,
  level: "AA" | "AAA" = "AA",
): boolean {
  const ratio = getContrastRatio(fgColor, bgColor);
  const requiredRatio = level === "AA" ? 3.0 : 4.5;
  return ratio >= requiredRatio;
}
