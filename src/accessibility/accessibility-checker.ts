/**
 * @file accessibility-checker.ts
 * Implements WCAG 2.1 contrast checking, color vision deficiency simulation,
 * palette-wide accessibility validation, and automated color adjustment.
 */

import { fromIColor, type IColor, toIColor } from "../core/color-operations.ts";
import chroma from "chroma-js";

/**
 * WCAG 2.1 contrast ratio check
 *
 * @param fg - Foreground color
 * @param bg - Background color
 * @returns Contrast ratio
 */
export function getContrastRatio(fg: IColor, bg: IColor): number {
  const lum1 = fromIColor(fg).luminance();
  const lum2 = fromIColor(bg).luminance();
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a foreground/background pair meets WCAG 2.1 AA or AAA standard.
 *
 * @param fg - Foreground color
 * @param bg - Background color
 * @param level - "AA" or "AAA"
 * @returns True if contrast meets or exceeds required ratio
 */
export function meetsContrastGuidelines(
  fg: IColor,
  bg: IColor,
  level: "AA" | "AAA" = "AA",
): boolean {
  const ratio = getContrastRatio(fg, bg);
  const required = level === "AA" ? 4.5 : 7.0;
  return ratio >= required;
}

/**
 * Simulate color vision deficiency using Brettel, Viénot, and Mollon (1997).
 * For brevity, we show a simplified approach using matrix transformation.
 *
 * @param color - IColor to simulate
 * @param type - protanopia | deuteranopia | tritanopia
 * @returns Simulated IColor
 */
export function simulateCVD(
  color: IColor,
  type: "protanopia" | "deuteranopia" | "tritanopia",
): IColor {
  // Simplified transform matrices
  const matrixMap: Record<string, number[][]> = {
    protanopia: [
      [0.0, 1.05118294, -0.05116099],
      [0.0, 0.0, 1.0],
      [0.0, 0.0, 1.0],
    ],
    deuteranopia: [
      [0.9513092, 0.0, 0.04866992],
      [0.0, 1.0, 0.0],
      [0.0, 0.0, 1.0],
    ],
    tritanopia: [
      [1.0, 0.0, 0.0],
      [0.0, 1.0, 0.0],
      [-0.86744736, 1.86727089, 0.0],
    ],
  };

  const rgb = fromIColor(color).rgb();
  const mat = matrixMap[type];

  const r = Math.min(
    Math.max(0, rgb[0] * mat[0][0] + rgb[1] * mat[0][1] + rgb[2] * mat[0][2]),
    255,
  );
  const g = Math.min(
    Math.max(0, rgb[0] * mat[1][0] + rgb[1] * mat[1][1] + rgb[2] * mat[1][2]),
    255,
  );
  const b = Math.min(
    Math.max(0, rgb[0] * mat[2][0] + rgb[1] * mat[2][1] + rgb[2] * mat[2][2]),
    255,
  );

  return toIColor(chroma(r, g, b));
}

/**
 * Validate an entire palette for accessibility.
 * Returns a matrix of boolean values indicating compliance.
 *
 * @param palette - Array of IColor
 * @param level - "AA" or "AAA"
 * @returns 2D boolean array [i][j] indicates compliance of palette[i] with palette[j]
 */
export function validatePaletteAccessibility(
  palette: IColor[],
  level: "AA" | "AAA" = "AA",
): boolean[][] {
  const results: boolean[][] = [];
  for (let i = 0; i < palette.length; i++) {
    const row: boolean[] = [];
    for (let j = 0; j < palette.length; j++) {
      row.push(meetsContrastGuidelines(palette[i], palette[j], level));
    }
    results.push(row);
  }
  return results;
}

/**
 * Automatically adjust a color to meet contrast guidelines against a background.
 *
 * @param fg - The color to adjust
 * @param bg - The background color to compare against
 * @param level - "AA" or "AAA"
 * @param maxAttempts - Limit for iterative adjustments
 * @returns The adjusted IColor that meets the guideline or the original if it cannot be met
 */
export function autoAdjustForAccessibility(
  fg: IColor,
  bg: IColor,
  level: "AA" | "AAA" = "AA",
  maxAttempts: number = 10,
): IColor {
  let attempts = 0;
  let adjusted = fg;
  const threshold = level === "AA" ? 4.5 : 7;

  while (attempts < maxAttempts) {
    if (getContrastRatio(adjusted, bg) >= threshold) {
      return adjusted;
    }
    // Increase or decrease luminance
    const c = chroma(fromIColor(adjusted).rgb());
    const sign = fromIColor(adjusted).luminance() < fromIColor(bg).luminance()
      ? -0.05
      : 0.05;
    const nextLum = Math.min(Math.max(0, c.luminance() + sign), 1);
    const next = c.luminance(nextLum);
    adjusted = toIColor(next);
    attempts++;
  }
  return fg; // fallback if we can't meet the threshold within attempts
}
