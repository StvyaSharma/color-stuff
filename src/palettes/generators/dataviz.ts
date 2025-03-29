/**
 * @file palettes/generators/dataviz.ts
 * Generates color palettes optimized for perceptual distinctiveness in data visualization.
 * Uses OkLab distance and a greedy algorithm to maximize minimum separation.
 */

import type { IColor, Palette, RGB } from "../../core/color.types.ts";
import { toIColor } from "../../core/conversions.ts";
import type { DataVizGeneratorOptions } from "../palette.types.ts";
import { colorDifference } from "../../core/operations.ts"; // Uses DeltaE 2000

/**
 * Generates a palette optimized for data visualization, aiming for maximum
 * perceptual distinctiveness between colors. It uses a greedy approach based
 * on OkLab distances.
 *
 * @param options - Configuration options including `count`, `samples`, `minDistanceThreshold`, and optionally `backgroundColor`.
 * @returns An array of IColor objects forming the data visualization palette.
 * @throws Error if count is less than 1.
 *
 * @example
 * const options: DataVizGeneratorOptions = { count: 8, samples: 10000, minDistanceThreshold: 15 };
 * const vizPalette = generateDataVizPalette(options);
 * console.log(vizPalette.map(c => c.hex));
 */
export function generateDataVizPalette(
  options: DataVizGeneratorOptions,
): Palette {
  const {
    count,
    samples = 5000, // Default number of random candidates to generate
    minDistanceThreshold = 10, // Default minimum perceptual distance (DeltaE / OkLab dist)
    backgroundColor, // Optional background for contrast checks (can be IColor or string)
  } = options;

  if (count < 1) {
    throw new Error("Palette count must be at least 1.");
  }

  const backgroundIColor = backgroundColor
    ? toIColor(backgroundColor)
    : toIColor("white"); // Default bg

  // 1. Generate Candidate Colors
  const candidates: IColor[] = [];
  for (let i = 0; i < samples; i++) {
    const randomR = Math.floor(Math.random() * 256);
    const randomG = Math.floor(Math.random() * 256);
    const randomB = Math.floor(Math.random() * 256);
    const candidate = toIColor([randomR, randomG, randomB]);

    // Optional: Pre-filter candidates based on contrast with background
    // if (getContrastRatio(candidate, backgroundIColor) < 3.0) { // Example: Ensure min contrast 3:1
    //   continue;
    // }
    candidates.push(candidate);
  }

  if (candidates.length === 0) {
    // If filtering removed all candidates, generate one basic color
    console.warn(
      "No suitable candidate colors found after filtering. Generating a default palette.",
    );
    return [toIColor("gray")]; // Or throw error
  }

  // 2. Select Seed Color
  // Start with a random candidate
  const seedIndex = Math.floor(Math.random() * candidates.length);
  const initialColor = candidates.splice(seedIndex, 1)[0];
  const palette: Palette = [initialColor];

  // 3. Greedy Selection Loop
  while (palette.length < count && candidates.length > 0) {
    let bestCandidateIndex = -1;
    let maxMinDistance = -1; // Maximize the minimum distance to existing palette colors

    for (let i = 0; i < candidates.length; i++) {
      const candidate = candidates[i];
      let currentMinDistance = Infinity;

      // Calculate distance to all colors currently in the palette
      for (const paletteColor of palette) {
        // Use DeltaE 2000 for more accurate perceptual distance
        const dist = colorDifference(candidate, paletteColor);
        // const dist = okLabDistance(candidate.oklab, paletteColor.oklab); // Alternative: OkLab distance
        currentMinDistance = Math.min(currentMinDistance, dist);
      }

      // If this candidate is further from its nearest neighbor than the best found so far...
      if (currentMinDistance > maxMinDistance) {
        maxMinDistance = currentMinDistance;
        bestCandidateIndex = i;
      }
    }

    // If we found a suitable candidate
    if (bestCandidateIndex !== -1 && maxMinDistance >= minDistanceThreshold) {
      // Add the best candidate to the palette and remove it from the pool
      palette.push(candidates.splice(bestCandidateIndex, 1)[0]);
    } else {
      // No candidate meets the minimum distance threshold or no candidates left
      // console.warn(`Could not find a candidate meeting the distance threshold (${minDistanceThreshold}). Palette may have fewer than ${count} colors or low separation.`);
      // Option: Lower the threshold slightly and retry? Or just break.
      break; // Stop if no suitable candidate is found
    }
  }

  if (palette.length < count) {
    console.warn(
      `Generated palette has ${palette.length} colors, less than the requested ${count}, likely due to the distance threshold.`,
    );
  }

  // 4. Optional: Final check/warning for low distances in the generated palette
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const dist = colorDifference(palette[i], palette[j]);
      if (dist < minDistanceThreshold) {
        // console.warn(`Warning: Final palette colors ${i + 1} (${palette[i].hex}) and ${j + 1} (${palette[j].hex}) have low perceptual distance: ${dist.toFixed(2)}`);
      }
    }
  }

  return palette;
}
