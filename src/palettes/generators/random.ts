/**
 * @file palettes/generators/random.ts
 * Generates simple random color palettes.
 */

import type { IColor, Palette } from "../../core/color.types.ts";
import { toIColor } from "../../core/conversions.ts";
import type { PaletteGeneratorOptions } from "../palette.types.ts";
import { generateRandomHexColor } from "../../utils/misc.ts";

/**
 * Generates a palette consisting of purely random colors.
 *
 * @param options - Configuration options, primarily `count`.
 * @returns An array of IColor objects forming the random palette.
 *
 * @example
 * const randomPalette = generateRandomPalette({ count: 10 });
 * console.log(randomPalette.map(c => c.hex));
 */
export function generateRandomPalette(
  options: PaletteGeneratorOptions,
): Palette {
  const { count } = options;
  if (count < 1) {
    return [];
  }

  const palette: Palette = [];
  for (let i = 0; i < count; i++) {
    palette.push(toIColor(generateRandomHexColor()));
  }
  return palette;
}
