/**
 * @file harmony/rules.ts
 * Provides functions for calculating standard color harmony relationships based on hue rotation.
 * These functions operate on IColor objects.
 */

import type { IColor } from "../core/color.types";
import { rotateHue } from "../core/operations";

/**
 * Calculates the complementary color (180° hue rotation).
 *
 * @param baseColor - The starting IColor.
 * @returns The complementary IColor.
 *
 * @example
 * const blue = toIColor('blue');
 * const yellowOrange = generateComplementary(blue);
 */
export function generateComplementary(baseColor: IColor): IColor {
  return rotateHue(baseColor, 180);
}

/**
 * Calculates analogous colors by rotating hue by a given angle in both directions.
 *
 * @param baseColor - The starting IColor.
 * @param angle - The angle separation (degrees). Defaults to 30°.
 * @returns An array containing two analogous IColor objects.
 *
 * @example
 * const red = toIColor('red');
 * const [magenta, orange] = generateAnalogous(red, 30);
 */
export function generateAnalogous(
  baseColor: IColor,
  angle: number = 30,
): [IColor, IColor] {
  const analogous1 = rotateHue(baseColor, angle);
  const analogous2 = rotateHue(baseColor, -angle);
  return [analogous1, analogous2];
}

/**
 * Calculates triadic colors (±120° hue rotation).
 *
 * @param baseColor - The starting IColor.
 * @returns An array containing two triadic IColor objects.
 *
 * @example
 * const green = toIColor('green');
 * const [purple, orange] = generateTriadic(green);
 */
export function generateTriadic(baseColor: IColor): [IColor, IColor] {
  const triadic1 = rotateHue(baseColor, 120);
  const triadic2 = rotateHue(baseColor, -120); // Same as 240
  return [triadic1, triadic2];
}

/**
 * Calculates split-complementary colors.
 * Finds the complementary color, then takes two colors adjacent to it (typically ±30°).
 *
 * @param baseColor - The starting IColor.
 * @param angle - The angle separation from the complement (degrees). Defaults to 30°.
 * @returns An array containing the two split-complementary IColor objects.
 *
 * @example
 * const yellow = toIColor('yellow'); // Hue ~60
 * // Complement is blue (hue ~240)
 * // Split complements are around 210 (cyan-blue) and 270 (violet)
 * const [split1, split2] = generateSplitComplementary(yellow);
 */
export function generateSplitComplementary(
  baseColor: IColor,
  angle: number = 30,
): [IColor, IColor] {
  const complementaryHue = (baseColor.hsl[0] + 180) % 360;
  const split1 = rotateHue(baseColor, 180 - angle); // Rotate base towards first split
  const split2 = rotateHue(baseColor, 180 + angle); // Rotate base towards second split
  return [split1, split2];
}

/**
 * Calculates square harmony colors (0°, 90°, 180°, 270° hue rotation).
 *
 * @param baseColor - The starting IColor.
 * @returns An array containing the three additional square harmony IColor objects.
 *
 * @example
 * const red = toIColor('red'); // Hue 0
 * const [yellow, cyan, blue] = generateSquare(red); // Hues 90, 180, 270
 */
export function generateSquare(baseColor: IColor): [IColor, IColor, IColor] {
  const square1 = rotateHue(baseColor, 90);
  const square2 = rotateHue(baseColor, 180); // Same as complementary
  const square3 = rotateHue(baseColor, 270);
  return [square1, square2, square3];
}

/**
 * Calculates tetradic (rectangular) harmony colors.
 * This involves the base color, its complement, and two other colors forming a rectangle
 * on the color wheel (e.g., base + 60°, complement + 60°).
 *
 * @param baseColor - The starting IColor.
 * @param angle - The angle offset used to form the rectangle (degrees). Defaults to 60°.
 * @returns An array containing the three additional rectangular harmony IColor objects.
 *
 * @example
 * const teal = toIColor('teal'); // Hue ~180
 * const [redOrange, blue, purple] = generateTetradic(teal, 60); // Hues ~0, ~240, ~300
 */
export function generateTetradic(
  baseColor: IColor,
  angle: number = 60,
): [IColor, IColor, IColor] {
  const complementary = generateComplementary(baseColor);
  const tetradic1 = rotateHue(baseColor, angle);
  const tetradic2 = rotateHue(complementary, angle); // Or rotateHue(baseColor, 180 + angle)
  return [complementary, tetradic1, tetradic2];
}
