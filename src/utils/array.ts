/**
 * @file utils/array.ts
 * Utility functions for array manipulation.
 */

import type { IColor } from "../core/color.types.ts";
import type Seedrandom from "seedrandom";

/**
 * Randomly shuffles the elements of an array in place using the Fisher-Yates algorithm.
 * Can optionally use a seeded random number generator.
 *
 * @template T - The type of elements in the array.
 * @param array - The array to shuffle.
 * @param rng - Optional seeded random number generator (e.g., from Seedrandom). Defaults to Math.random.
 * @returns The shuffled array (modified in place).
 *
 * @example
 * const myArray = [1, 2, 3, 4, 5];
 * shuffleArray(myArray); // Shuffles using Math.random
 * console.log(myArray); // e.g., [ 3, 1, 5, 2, 4 ]
 *
 * const seededRng = new Seedrandom('mySeed');
 * shuffleArray(myArray, seededRng); // Shuffles reproducibly
 */
export function shuffleArray<T>(array: T[], rng?: Seedrandom.PRNG): T[] {
  let currentIndex = array.length;
  const random = rng || Math.random; // Use provided RNG or default

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

/**
 * Sorts an array of IColor objects based on their hue value (0-360).
 * Colors with NaN hue (like grays) are typically placed at the beginning or end.
 *
 * @param colors - Array of IColor objects.
 * @param nanPosition - Where to place colors with NaN hue ('start' or 'end'). Defaults to 'start'.
 * @returns A new array of IColor objects sorted by hue.
 *
 * @example
 * const palette = [toIColor('blue'), toIColor('red'), toIColor('green'), toIColor('gray')];
 * const sortedPalette = sortByHue(palette);
 * // Output order approx: gray, red, green, blue
 */
export function sortByHue(
  colors: IColor[],
  nanPosition: "start" | "end" = "start",
): IColor[] {
  return [...colors].sort((a, b) => {
    const hueA = a.hsl[0];
    const hueB = b.hsl[0];
    const aIsNaN = isNaN(hueA);
    const bIsNaN = isNaN(hueB);

    if (aIsNaN && bIsNaN) return 0; // Keep relative order of NaNs
    if (aIsNaN) return nanPosition === "start" ? -1 : 1;
    if (bIsNaN) return nanPosition === "start" ? 1 : -1;

    // Both are numbers, sort normally
    return hueA - hueB;
  });
}

/**
 * Returns a random element from an array.
 * Can optionally use a seeded random number generator.
 *
 * @template T The type of elements in the array.
 * @param array The input array.
 * @param rng Optional seeded random number generator. Defaults to Math.random.
 * @returns A random element from the array, or undefined if the array is empty.
 *
 * @example
 * const choices = ['apple', 'banana', 'cherry'];
 * const randomFruit = randomFromArray(choices);
 */
export const randomFromArray = <T>(
  array: T[],
  rng?: Seedrandom.PRNG,
): T | undefined => {
  if (array.length === 0) {
    return undefined;
  }
  const random = rng || Math.random;
  return array[Math.floor(random() * array.length)];
};
