/**
 * @file utils/misc.ts
 * Miscellaneous utility functions.
 */

/**
 * Delays execution for a specified duration.
 * Useful for simulating asynchronous operations or throttling.
 *
 * @param durationInMs - The time to wait in milliseconds.
 * @returns A Promise that resolves after the duration.
 *
 * @example
 * console.log("Start");
 * await sleep(1000);
 * console.log("End after 1 second");
 */
export const sleep = (durationInMs: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, durationInMs));
};

/**
 * Generates a random hex color string (e.g., "#RRGGBB").
 *
 * @returns A random hex color string.
 *
 * @example
 * const randomHex = generateRandomHexColor(); // e.g., "#a3b1f4"
 */
export function generateRandomHexColor(): string {
  // Generate random number between 0 and 0xFFFFFF (16777215)
  const randomNum = Math.floor(Math.random() * 16777216);
  // Convert to hex string, pad with leading zeros if needed
  const hex = randomNum.toString(16).padStart(6, "0");
  return `#${hex}`;
}
