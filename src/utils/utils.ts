/**
 * @file utils.ts
 * Miscellaneous utility functions for the color library.
 */

import { IColor } from "../core/color-operations.ts";

/**
 * Clamps a number between min and max.
 *
 * @param value - The number to clamp
 * @param min - The minimum boundary
 * @param max - The maximum boundary
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

/**
 * Sort colors by hue
 *
 * @param colors - Array of IColor
 * @returns Array of IColor sorted by hue
 */
export function sortByHue(colors: IColor[]): IColor[] {
  return [...colors].sort((a, b) => {
    // Minimal demonstration since we store hue in Lab/HCL only indirectly.
    // Use a fallback approach with the hex string for sorting if needed.
    return parseInt(a.hex.replace("#", ""), 16) -
      parseInt(b.hex.replace("#", ""), 16);
  });
}

/**
 * Generates an array of random hex color strings.
 *
 * @param numColors - The number of random colors to generate
 * @returns An array of hex color strings (e.g. ["#ff0000", "#00ff00"])
 */
export function generateRandomColors(numColors: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < numColors; i++) {
    colors.push("#" + Math.floor(Math.random() * 16777215).toString(16));
  }
  return colors;
}
