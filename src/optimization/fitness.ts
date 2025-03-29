/**
 * @file optimization/fitness.ts
 * Defines the primary fitness function for evaluating palette solutions.
 * This function aims to capture desired aesthetic and accessibility properties.
 */

import type { IColor, Palette } from "../core/color.types.ts";
import { getContrastRatio } from "../accessibility/contrast.ts"; // Use centralized contrast
import { colorDifference } from "../core/operations.ts"; // Use DeltaE 2000
import { fromIColor } from "../core/conversions.ts";

/**
 * Evaluates a generated palette solution based on a primary color and other criteria.
 * A higher score indicates a better palette.
 *
 * The palette is expected to be an array of 5 IColor objects, conventionally used as:
 * [accent, background, surface, button_text, main_text]
 *
 * **Scoring Criteria:**
 * - Contrast: High contrast between text elements and their backgrounds (primary/accent vs buttonText, surface vs mainText).
 * - Readability: Sufficient contrast between key UI elements (primary/accent vs surface, background vs surface).
 * - Harmony/Separation: Moderate contrast between primary, accent, and background colors (avoiding clashes and excessive similarity).
 * - Background Quality: Background should have moderate luminance and avoid being monotone gray.
 * - Color Difference: Penalize palettes where colors are perceptually too similar (low DeltaE).
 *
 * @param primaryColor - The primary reference IColor object.
 * @param palette - An array of 5 IColor objects representing the palette solution.
 * @returns Fitness score (higher is better). Returns -Infinity for invalid palettes (e.g., wrong size).
 */
export function evaluatePaletteSolution(
  primaryColor: IColor,
  palette: Palette,
): number {
  // --- Validation ---
  if (!palette || palette.length !== 5) {
    console.warn(
      `Fitness function requires a palette of 5 colors, received ${
        palette?.length ?? 0
      }.`,
    );
    return -Infinity; // Indicate an invalid solution
  }
  // Check if any color object is invalid (optional, assuming toIColor handles basic validation)
  if (palette.some((color) => !color || !color.rgb)) {
    console.warn("Fitness function received invalid IColor object in palette.");
    return -Infinity;
  }

  let fitness = 0;
  const [accentColor, backgroundColor, surfaceColor, buttonText, mainText] =
    palette;

  // --- Weights for Different Criteria ---
  const W_TEXT_CONTRAST = 2.0;
  const W_UI_CONTRAST = 1.5;
  const W_HARMONY_CONTRAST = 1.0;
  const W_BG_QUALITY = 1.0;
  const W_MIN_DELTA_E = 0.5; // Penalty weight for colors being too close

  // --- Calculations ---

  // 1. Text Contrast (Crucial)
  // Contrast for text on buttons (primary/accent backgrounds)
  const contrastPrimaryButton = getContrastRatio(buttonText, primaryColor);
  const contrastAccentButton = getContrastRatio(buttonText, accentColor);
  // Reward meeting AA (4.5), strongly reward AAA (7)
  fitness += W_TEXT_CONTRAST *
    (Math.min(contrastPrimaryButton, 7.0) +
      Math.min(contrastAccentButton, 7.0)); // Max reward around 14 per pair

  // Contrast for main text on surface
  const contrastMainSurface = getContrastRatio(mainText, surfaceColor);
  fitness += W_TEXT_CONTRAST * 2 * Math.min(contrastMainSurface, 7.0); // Double weight as it's main content

  // 2. UI Element Contrast
  const contrastPrimarySurface = getContrastRatio(primaryColor, surfaceColor);
  const contrastAccentSurface = getContrastRatio(accentColor, surfaceColor);
  const contrastBgSurface = getContrastRatio(backgroundColor, surfaceColor);

  // Reward sufficient contrast (e.g., > 3:1 for AA Large)
  fitness += W_UI_CONTRAST *
    (Math.min(contrastPrimarySurface, 4.5) +
      Math.min(contrastAccentSurface, 4.5));
  fitness += W_UI_CONTRAST * Math.min(contrastBgSurface, 3.0); // Lower requirement for bg/surface separation

  // 3. Harmony / Separation Contrast (Primary, Accent, Background)
  // Aim for moderate contrast - not too low, not excessively high.
  const contrastPrimaryAccent = getContrastRatio(primaryColor, accentColor);
  const contrastPrimaryBg = getContrastRatio(primaryColor, backgroundColor);
  const contrastAccentBg = getContrastRatio(accentColor, backgroundColor);

  // Reward being in a "good" range (e.g., 2:1 to 7:1)
  const rewardHarmony = (ratio: number) => {
    if (ratio < 1.5) return -2; // Penalize too low
    if (ratio < 3.0) return 1;
    if (ratio < 7.0) return 2; // Sweet spot
    if (ratio < 10.0) return 1;
    return 0; // Penalize too high slightly less
  };
  fitness += W_HARMONY_CONTRAST *
    (rewardHarmony(contrastPrimaryAccent) + rewardHarmony(contrastPrimaryBg) +
      rewardHarmony(contrastAccentBg));

  // 4. Background Quality
  const bgLuminance = fromIColor(backgroundColor).luminance();
  const bgRgb = backgroundColor.rgb;
  const bgIsMonotone = bgRgb[0] === bgRgb[1] && bgRgb[1] === bgRgb[2];
  const bgChroma = fromIColor(backgroundColor).lch()[1]; // Get chroma

  // Penalize very dark/light backgrounds and monotone grays (low chroma)
  if (bgLuminance < 0.1 || bgLuminance > 0.9) {
    fitness -= W_BG_QUALITY * 2;
  }
  if (bgIsMonotone || bgChroma < 5) { // Chroma threshold for 'grayness'
    fitness -= W_BG_QUALITY * 1;
  } else {
    fitness += W_BG_QUALITY * 1; // Reward non-gray background
  }

  // 5. Minimum Perceptual Distance (DeltaE)
  // Penalize if any two colors in the palette are too similar
  let minDeltaE = Infinity;
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      minDeltaE = Math.min(minDeltaE, colorDifference(palette[i], palette[j]));
    }
  }

  const targetMinDeltaE = 10; // Target minimum separation (adjust based on need)
  if (minDeltaE < targetMinDeltaE) {
    // Penalize proportionally to how much below the target it is
    fitness -= W_MIN_DELTA_E * (targetMinDeltaE - minDeltaE);
  } else {
    fitness += W_MIN_DELTA_E * 2; // Small reward for good separation
  }

  // --- Final check ---
  if (isNaN(fitness) || !isFinite(fitness)) {
    // console.warn("Fitness calculation resulted in NaN or Infinity.");
    return -Infinity; // Return consistent invalid score
  }

  return fitness;
}
