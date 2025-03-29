/**
 * @file palettes/generators/harmony_based.ts
 * Generates color palettes based on classical color harmony rules.
 */

import { type HSL, type IColor, type Palette } from "../../core/color.types";
import { fromIColor, toIColor } from "../../core/conversions";
import { type HarmonyGeneratorOptions } from "../palette.types";
import {
  adjustBrightness,
  adjustSaturation,
  rotateHue,
} from "../../core/operations";
import {
  generateAnalogous,
  generateComplementary,
  generateSplitComplementary,
  generateSquare, // Added square harmony rule
  generateTetradic, // Tetradic might be better named 'rectangular' sometimes
  generateTriadic,
} from "../../harmony/rules"; // Use centralized harmony rules
import { clamp } from "../../utils/math";

/**
 * Generates a palette based on a specified color harmony rule.
 *
 * @param options - Configuration options including `count`, `seedColor`, and `harmonyRule`.
 *                  Specific rules might use `analogousAngle` or `monochromaticSteps`.
 * @returns An array of IColor objects forming the harmony-based palette.
 * @throws Error if seedColor is not provided or harmonyRule is invalid.
 *
 * @example
 * const options: HarmonyGeneratorOptions = {
 *   count: 5,
 *   seedColor: '#3498db', // Blue
 *   harmonyRule: 'triadic'
 * };
 * const triadicPalette = generateHarmonyPalette(options);
 * console.log(triadicPalette.map(c => c.hex)); // [blue, a yellow-orange, a magenta]
 *
 * const monoOptions: HarmonyGeneratorOptions = {
 *  count: 7,
 *  seedColor: toIColor('green'),
 *  harmonyRule: 'monochromatic',
 *  monochromaticSteps: 6 // Explicitly set steps
 * };
 * const monoPalette = generateHarmonyPalette(monoOptions);
 */
export function generateHarmonyPalette(
  options: HarmonyGeneratorOptions,
): Palette {
  const {
    count,
    seedColor,
    harmonyRule,
    analogousAngle = 30, // Default angle for analogous
    monochromaticSteps, // Use count if not provided
  } = options;

  if (!seedColor) {
    throw new Error(
      "A seedColor is required for harmony-based palette generation.",
    );
  }

  const baseColor = toIColor(seedColor);
  const steps = monochromaticSteps ?? count - 1; // Use count for mono steps default

  let harmonyColors: IColor[] = [baseColor];

  switch (harmonyRule.toLowerCase()) {
    case "complementary":
      harmonyColors.push(generateComplementary(baseColor));
      break;
    case "analogous":
      harmonyColors.push(...generateAnalogous(baseColor, analogousAngle));
      break;
    case "triadic":
      harmonyColors.push(...generateTriadic(baseColor));
      break;
    case "splitcomplementary":
    case "split-complementary":
      harmonyColors.push(...generateSplitComplementary(baseColor));
      break;
    case "tetradic": // Often means rectangular
    case "rectangular":
      harmonyColors.push(...generateTetradic(baseColor)); // Tetradic needs 3 more colors
      break;
    case "square":
      harmonyColors.push(...generateSquare(baseColor)); // Square needs 3 more colors
      break;
    case "monochromatic":
      harmonyColors = generateMonochromaticPalette(baseColor, steps); // Uses dedicated mono func
      break;
    default:
      throw new Error(`Unsupported harmony rule: ${harmonyRule}`);
  }

  // Ensure the palette has the desired count by interpolation or selection
  return adjustPaletteCount(harmonyColors, count);
}

/**
 * Generates a monochromatic palette by varying lightness and/or saturation.
 * @param baseColor - The starting color.
 * @param steps - The number of variations to generate (excluding the base color).
 * @returns A palette including the base color and its variations.
 * @private
 */
function generateMonochromaticPalette(
  baseColor: IColor,
  steps: number,
): Palette {
  const palette: Palette = [baseColor];
  const baseLightness = baseColor.hsl[2];
  const baseSaturation = baseColor.hsl[1];

  // Determine ranges - go towards both black and white
  const lightStep = baseLightness / (Math.floor(steps / 2) + 1);
  const darkStep = (100 - baseLightness) / (Math.ceil(steps / 2) + 1);
  // Optional: Add saturation variation for more richness
  const satStep = baseSaturation > 50
    ? -baseSaturation / (steps + 1)
    : (100 - baseSaturation) / (steps + 1);

  // Generate darker shades
  for (let i = 1; i <= Math.ceil(steps / 2); i++) {
    const l = clamp(baseLightness + darkStep * i, 0, 100);
    // const s = clamp(baseSaturation + satStep * i, 0, 100); // Optional saturation change
    const shade = fromIColor(baseColor).set("hsl.l", l / 100); //.set('hsl.s', s / 100);
    palette.push(toIColor(shade));
  }

  // Generate lighter tints
  for (let i = 1; i <= Math.floor(steps / 2); i++) {
    const l = clamp(baseLightness - lightStep * i, 0, 100);
    // const s = clamp(baseSaturation - satStep * i, 0, 100); // Optional saturation change
    const tint = fromIColor(baseColor).set("hsl.l", l / 100); //.set('hsl.s', s / 100);
    palette.push(toIColor(tint));
  }

  // Sort by lightness for a typical monochromatic scale order
  palette.sort((a, b) => a.hsl[2] - b.hsl[2]);

  return palette;
}

/**
 * Adjusts the generated harmony colors to match the desired count.
 * If too few, interpolates. If too many, selects a subset.
 * @param currentPalette - The initial set of harmony colors.
 * @param targetCount - The desired number of colors.
 * @returns A palette with the target number of colors.
 * @private
 */
function adjustPaletteCount(
  currentPalette: Palette,
  targetCount: number,
): Palette {
  const currentCount = currentPalette.length;

  if (currentCount === targetCount) {
    return currentPalette;
  }

  if (currentCount < targetCount) {
    // Interpolate to add more colors
    if (currentCount < 2) {
      // Cannot interpolate, duplicate the single color
      return Array(targetCount).fill(currentPalette[0] || toIColor("black"));
    }
    const scale = chroma.scale(currentPalette.map((c) => c.hex)).mode("lch")
      .colors(targetCount);
    return scale.map((hex) => toIColor(hex));
  } else {
    // Select a subset if too many colors were generated
    // Simple slicing for now, could be smarter (e.g., select most distinct)
    return currentPalette.slice(0, targetCount);
  }
}
