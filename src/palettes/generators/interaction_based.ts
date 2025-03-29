/**
 * @file palettes/generators/interaction_based.ts
 * Generates palettes based on color interaction principles like relativity and subtraction.
 */

import type { IColor, Palette } from "../../core/color.types.ts";
import { type fromIColor, toIColor } from "../../core/conversions.ts";
import type { InteractionGeneratorOptions } from "../palette.types.ts";
import { perceivedColor, subtractColor } from "../../interaction/perceptual.ts";
import { generateRandomHexColor as generateRandomHex } from "../../utils/misc.ts"; // Utility for random hex

/**
 * Generates a palette based on specified color interaction models.
 *
 * @param options - Configuration options including `count`, `seedColor`, `interactionModel`,
 *                  and model-specific options like `groundColor` or `initialSurroundings`.
 * @returns An array of IColor objects forming the interaction-based palette.
 * @throws Error if required options for the model are missing.
 *
 * @example
 * // Relativity Example
 * const relativityOptions: InteractionGeneratorOptions = {
 *   count: 5,
 *   seedColor: '#8a2be2', // BlueViolet
 *   interactionModel: 'relativity'
 * };
 * const relativityPalette = generateInteractionPalette(relativityOptions);
 * console.log('Relativity Palette:', relativityPalette.map(c => c.hex));
 *
 * // Subtraction Example
 * const subtractionOptions: InteractionGeneratorOptions = {
 *   count: 6,
 *   seedColor: '#ff6347', // Tomato
 *   interactionModel: 'subtraction',
 *   groundColor: '#f5f5dc', // Beige
 *   subtractionFactor: 0.15
 * };
 * const subtractionPalette = generateInteractionPalette(subtractionOptions);
 * console.log('Subtraction Palette:', subtractionPalette.map(c => c.hex));
 */
export function generateInteractionPalette(
  options: InteractionGeneratorOptions,
): Palette {
  const {
    count,
    seedColor,
    interactionModel,
    groundColor,
    subtractionFactor = 0.1, // Default factor for subtraction
    initialSurroundings = [], // Default empty surroundings for relativity
  } = options;

  if (!seedColor) {
    throw new Error(
      "A seedColor is required for interaction-based palette generation.",
    );
  }
  const baseColor = toIColor(seedColor);
  let generatedPalette: Palette = [baseColor];

  switch (interactionModel.toLowerCase()) {
    case "relativity":
      generatedPalette = generateRelativityPalette(
        baseColor,
        count,
        initialSurroundings,
      );
      break;

    case "subtraction":
      if (!groundColor) {
        throw new Error(
          "A groundColor is required for the subtraction interaction model.",
        );
      }
      const ground = toIColor(groundColor);
      generatedPalette = generateSubtractionPalette(
        baseColor,
        ground,
        count,
        subtractionFactor,
      );
      break;

    default:
      throw new Error(
        `Unsupported interaction model: ${interactionModel}. Use 'relativity' or 'subtraction'.`,
      );
  }

  // Ensure the final palette has the correct count using the helper
  // This might involve interpolation or slicing if the core generation logic doesn't produce exact count
  //return adjustPaletteCount(generatedPalette, count);
  // The internal generators already aim for the correct count, maybe just slice if needed.
  return generatedPalette.slice(0, count);
}

/**
 * Generates a palette based on the principle of color relativity.
 * Creates variations of the base color influenced by simulated surrounding colors.
 * @param baseColor - The central color.
 * @param count - The total number of colors desired in the palette.
 * @param initialSurroundings - Optional initial surrounding colors (IColor or string).
 * @returns The generated palette.
 * @private
 */
function generateRelativityPalette(
  baseColor: IColor,
  count: number,
  initialSurroundings: (IColor | string)[],
): Palette {
  const palette: Palette = [baseColor];
  let surroundings: IColor[];

  // Use provided surroundings or generate random ones
  if (initialSurroundings.length > 0) {
    surroundings = initialSurroundings.map((s) => toIColor(s));
  } else {
    surroundings = [];
    // Generate count - 1 random surroundings, or maybe more for variety
    const numSurroundingsToGenerate = count > 1 ? count * 2 : 2; // Generate more for variety
    for (let i = 0; i < numSurroundingsToGenerate; i++) {
      const randomHex = generateRandomHex(); // Assumes this returns one hex string
      surroundings.push(toIColor(randomHex));
    }
  }

  // Ensure there are surroundings if count > 1
  if (count > 1 && surroundings.length === 0) {
    // Generate at least one default random surrounding if none were provided or generated
    surroundings.push(toIColor(generateRandomHex()));
  }

  // Generate remaining colors by simulating perception with different surroundings
  for (let i = 1; i < count; i++) {
    // Pick a surrounding color (cycle through the available surroundings)
    // Ensure surroundings array is not empty before using modulo
    const surrounding = surroundings.length > 0
      ? surroundings[i % surroundings.length]
      : baseColor; // Fallback, though ideally surroundings should always exist if count > 1

    // Calculate the perceived color of the base color when next to this surrounding color
    const perceived = perceivedColor(baseColor, [surrounding]); // Pass surrounding as array
    palette.push(perceived);
  }
  return palette;
}

/**
 * Generates a palette by iteratively subtracting the influence of a ground color.
 * @param baseColor - The starting color.
 * @param groundColor - The color whose influence is subtracted.
 * @param count - The total number of colors desired in the palette.
 * @param baseSubtractionFactor - The initial factor for subtraction, increases iteratively.
 * @returns The generated palette.
 * @private
 */
function generateSubtractionPalette(
  baseColor: IColor,
  groundColor: IColor,
  count: number,
  baseSubtractionFactor: number,
): Palette {
  const palette: Palette = [baseColor];
  let previousColor = baseColor;

  for (let i = 1; i < count; i++) {
    // Increase subtraction factor slightly for each step for progressive change
    const currentFactor = baseSubtractionFactor * (1 + i * 0.5); // Example incremental increase
    // Apply subtraction based on the *previous* color in the sequence for a smoother progression
    const subtractedColor = subtractColor(
      previousColor,
      groundColor,
      currentFactor,
    );
    palette.push(subtractedColor);
    previousColor = subtractedColor; // Update for the next iteration
  }
  return palette;
}
