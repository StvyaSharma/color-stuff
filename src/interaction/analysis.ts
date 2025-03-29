/**
 * @file interaction/analysis.ts
 * Functions for analyzing color palettes, such as calculating average color or vibe shift.
 */
import chroma from "chroma-js";
import type { IColor, Lab, Palette } from "../core/color.types";
import { fromIColor, toIColor } from "../core/conversions";

/**
 * Calculates the average color of a palette in Lab color space.
 * This can give a rough idea of the palette's overall perceptual 'center'.
 *
 * @param palette - An array of IColor objects.
 * @returns The average color represented as a Lab object { L, a, b }. Returns { L: 0, a: 0, b: 0 } for empty palettes.
 *
 * @example
 * const myPalette = [toIColor('red'), toIColor('yellow'), toIColor('lime')];
 * const avgColor = calculateAverageColor(myPalette);
 * console.log(avgColor); // { L: ..., a: ..., b: ... } representing the average
 * console.log(chroma.lab(avgColor.L, avgColor.a, avgColor.b).hex()); // See the average color
 */
export function calculateAverageColor(palette: Palette): Lab {
  if (palette.length === 0) {
    return { L: 0, a: 0, b: 0 };
  }

  let totalL = 0;
  let totalA = 0;
  let totalB = 0;

  for (const color of palette) {
    const lab = color.lab; // Access pre-calculated Lab values
    totalL += lab[0];
    totalA += lab[1];
    totalB += lab[2];
  }

  const numColors = palette.length;
  return {
    L: totalL / numColors,
    a: totalA / numColors,
    b: totalB / numColors,
  };
}

/**
 * Calculates a 'vibe shift' metric between two palettes.
 * This is defined as the Euclidean distance between the average Lab colors of the two palettes.
 * A higher value indicates a greater overall perceptual shift between the palettes. Useful for comparing
 * minor adjustments or the results of different generation methods.
 *
 * @param palette1 - The first Palette (array of IColor).
 * @param palette2 - The second Palette (array of IColor).
 * @returns A numerical value representing the distance between the average colors of the palettes in Lab space.
 *
 * @example
 * const paletteA = [toIColor('red'), toIColor('green')];
 * const paletteB = [toIColor('blue'), toIColor('yellow')];
 * const shift = calculateVibeShift(paletteA, paletteB);
 * console.log(`Vibe shift: ${shift}`);
 */
export function calculateVibeShift(
  palette1: Palette,
  palette2: Palette,
): number {
  const avg1 = calculateAverageColor(palette1);
  const avg2 = calculateAverageColor(palette2);

  // Calculate the Euclidean distance in Lab space
  const deltaL = avg2.L - avg1.L;
  const deltaA = avg2.a - avg1.a;
  const deltaB = avg2.b - avg1.b;

  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}
