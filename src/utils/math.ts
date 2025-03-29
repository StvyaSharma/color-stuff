/**
 * @file utils/math.ts
 * Mathematical utility functions.
 */

/**
 * Clamps a number within a specified range [min, max].
 *
 * @param value - The number to clamp.
 * @param min - The minimum allowed value (inclusive).
 * @param max - The maximum allowed value (inclusive).
 * @returns The clamped value. Returns NaN if min > max.
 *
 * @example
 * clamp(15, 0, 10); // 10
 * clamp(-5, 0, 10); // 0
 * clamp(5, 0, 10);  // 5
 */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) return NaN; // Or throw error?
  return Math.max(min, Math.min(value, max));
}

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 *
 * @param min - Minimum value.
 * @param max - Maximum value.
 * @returns A random integer within the specified range.
 *
 * @example
 * const diceRoll = randomInt(1, 6); // Random integer between 1 and 6
 */
export function randomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Calculates the arithmetic mean (average) of an array of numbers.
 * Filters out non-finite values (NaN, Infinity, -Infinity).
 *
 * @param array - Array of numbers.
 * @returns The average value. Returns NaN if the array contains no finite numbers.
 *
 * @example
 * average([1, 2, 3, 4, 5]); // 3
 * average([10, NaN, 20]);    // 15
 * average([]);             // NaN
 */
export function average(array: number[]): number {
  const finiteNumbers = array.filter(isFinite);
  if (finiteNumbers.length === 0) {
    return NaN;
  }
  const sum = finiteNumbers.reduce((a, b) => a + b, 0);
  return sum / finiteNumbers.length;
}

/**
 * Calculates the range (difference between the maximum and minimum values) of an array of numbers.
 * Filters out non-finite values.
 *
 * @param array - Array of numbers.
 * @returns The range of values. Returns 0 if the array contains fewer than 2 finite numbers.
 *
 * @example
 * range([1, 5, 3, 9, 2]);    // 8 (9 - 1)
 * range([10, NaN, 5]);       // 5 (10 - 5)
 * range([7]);                // 0
 * range([]);                 // 0
 */
export function range(array: number[]): number {
  const finiteNumbers = array.filter(isFinite);
  if (finiteNumbers.length < 2) {
    return 0;
  }
  const min = Math.min(...finiteNumbers);
  const max = Math.max(...finiteNumbers);
  return max - min;
}

/**
 * Performs linear interpolation between two numbers.
 *
 * @param a - The starting value.
 * @param b - The ending value.
 * @param t - The interpolation factor (0.0 to 1.0). 0 returns 'a', 1 returns 'b'.
 * @returns The interpolated value.
 *
 * @example
 * lerp(10, 20, 0.5); // 15
 * lerp(0, 100, 0.25); // 25
 */
export function lerp(a: number, b: number, t: number): number {
  // Clamp t to [0, 1] for standard lerp behavior
  const clampedT = Math.max(0, Math.min(1, t));
  return a + (b - a) * clampedT;
}
