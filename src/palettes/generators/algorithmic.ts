/**
 * @file palettes/generators/algorithmic.ts
 * Implements palette generation algorithms like Hue Bingo, Legacy, Simplex Noise.
 * Adapted from the original `_asd.ts` file.
 */

import type { IColor, Palette } from "../../core/color.types.ts";
import { type fromIColor, type rgbTupleToHex, toIColor } from "../../core/conversions.ts";
import type { AlgorithmicGeneratorOptions } from "../palette.types.ts";
import { shuffleArray } from "../../utils/array.ts";
import { SimplexNoise } from "../../utils/noise.ts"; // Use centralized noise utility
import type { randomInt } from "../../utils/math.ts";
import Seedrandom from "seedrandom"; // Keep using Seedrandom for seeded generation
import chroma from "chroma-js";
import randomColor from "randomcolor"; // Keep dependency for this specific generator

/**
 * Converts color coordinates (like HSL, LCH, etc.) to a hex string based on the specified mode.
 *
 * @param angle - Hue angle (0-360) or first component.
 * @param val1 - Saturation/Chroma (0-100) or second component.
 * @param val2 - Lightness/Value (0-100) or third component.
 * @param mode - Color space mode (e.g., "hsluv", "lch", "oklch", "hsl"). Defaults to "hsluv".
 * @returns Hex color string (e.g., "#RRGGBB"). Returns empty string for unsupported modes.
 * @private - Internal helper function.
 */
function coordsToHex(
  angle: number,
  val1: number,
  val2: number,
  mode: string = "hsluv",
): string {
  try {
    let c: chroma.Color | null = null;
    switch (mode.toLowerCase()) {
      // Note: chroma-js doesn't directly support hsluv/hpluv.
      // If needed, would require external library like 'hsluv' and integrating its output.
      // For now, falling back or omitting these.
      case "hsluv":
      case "hpluv":
        console.warn(
          `Mode '${mode}' is not directly supported by chroma-js. Falling back.`,
        );
        // Fallback to HSL or similar if needed, or return error/empty
        c = chroma.hsl(angle, val1 / 100, val2 / 100); // Example fallback
        break;
      case "hcl":
        c = chroma.hcl(angle, val1, val2);
        break;
      case "lch":
        c = chroma.lch(val2, val1, angle); // Note LCH order: L, C, H
        break;
      case "oklch":
        // Chroma-js supports oklch
        // Need to scale L and C appropriately (L: 0-1, C: ~0-0.4)
        const ok_l = val2 / 100; // Assuming val2 is 0-100 lightness mapped to 0-1
        const ok_c = val1 / 100 * 0.4; // Assuming val1 is 0-100 chroma mapped to ~0-0.4 range
        c = chroma.oklch(ok_l, ok_c, angle);
        break;
      case "hsl":
        c = chroma.hsl(angle, val1 / 100, val2 / 100);
        break;
      case "hsv":
        c = chroma.hsv(angle, val1 / 100, val2 / 100);
        break;
      case "hcg":
        c = chroma.hcg(angle, val1 / 100, val2 / 100);
        break;
      default:
        console.warn(`Unsupported color mode: ${mode}`);
        return "";
    }
    return c.hex();
  } catch (error) {
    console.error(
      `Error converting coordinates to hex for mode ${mode}:`,
      error,
    );
    return "";
  }
}

/**
 * Generates a color palette using various algorithmic methods.
 */
export class AlgorithmicPaletteGenerator {
  private rnd: Seedrandom.PRNG;
  private simplex: SimplexNoise;

  /**
   * Initialize generator with an optional random seed.
   * @param seed - A string seed for reproducible random number generation.
   */
  constructor(seed?: string) {
    this.rnd = new Seedrandom(seed);
    this.simplex = new SimplexNoise(this.rnd()); // Seed simplex noise with the PRNG
  }

  /**
   * Generate a random number using the seeded PRNG.
   * @param min - Minimum value (inclusive). Defaults to 0.
   * @param max - Maximum value (exclusive if only min is provided, inclusive if both provided).
   * @returns A random number.
   * @private
   */
  private random(min: number = 0, max?: number): number {
    if (max === undefined) {
      // If only min is provided, generate between 0 and min (exclusive)
      return this.rnd() * min;
    }
    // If both min and max are provided, generate between min (inclusive) and max (inclusive)
    return Math.floor(this.rnd() * (max - min + 1)) + min;
  }

  /**
   * Generate palette using the "Hue Bingo" algorithm.
   * Creates harmonious colors with controlled hue spacing.
   * @param options - Configuration options. Requires `count`.
   * @returns An array of IColor objects.
   */
  public generateHueBingoPalette(
    options: AlgorithmicGeneratorOptions,
  ): Palette {
    const {
      count,
      parts = 4,
      minHueDiffAngle = 60,
      colorMode = "oklch",
      seed,
    } = options;
    if (seed && !this.rnd) this.rnd = new Seedrandom(seed); // Re-seed if provided in options

    const colorsHex: string[] = [];
    const actualParts = Math.max(2, Math.min(count, parts)); // Ensure reasonable parts

    // Create array of approximately evenly spaced hues
    const baseHue = this.random(0, 359);
    const numHues = Math.max(2, Math.floor(360 / minHueDiffAngle));
    const hueStep = 360 / numHues;
    const availableHues = Array.from(
      { length: numHues },
      (_, i) => (baseHue + i * hueStep) % 360,
    );

    // Ensure enough unique hues for the parts
    if (availableHues.length < actualParts) {
      console.warn(
        "Warning: minHueDiffAngle is too large for the number of parts requested. Hue collisions may occur.",
      );
    }
    // Shuffle available hues for variety
    const hues = shuffleArray(availableHues, this.rnd);

    // Generate first color (often darker/less saturated)
    const baseSaturation = this.random(10, 40); // Adjusted range
    const baseLightness = this.random(15, 35); // Adjusted range

    colorsHex.push(
      coordsToHex(
        hues[0],
        baseSaturation * this.random(0.8, 1.2), // Slight variation
        baseLightness * this.random(0.7, 1.1), // Slight variation
        colorMode,
      ),
    );

    // Generate middle colors with varying saturation/lightness
    const midSatMin = this.random(40, 60);
    const midSatMax = this.random(70, 95);
    const midLightMin = this.random(40, 60);
    const midLightMax = this.random(65, 85);

    // Use remaining hues, looping if necessary
    for (let i = 1; i < actualParts - 1; i++) {
      const hueIndex = i % hues.length; // Use modulus to cycle through hues
      const saturation = this.random(midSatMin, midSatMax);
      const lightness = this.random(midLightMin, midLightMax);
      colorsHex.push(
        coordsToHex(hues[hueIndex], saturation, lightness, colorMode),
      );
    }

    // Generate final color (often lighter)
    const finalLightness = this.random(75, 90); // Adjusted range
    colorsHex.push(
      coordsToHex(
        hues[(actualParts - 1) % hues.length], // Use last available hue slot
        baseSaturation * this.random(0.8, 1.2), // Can reuse base saturation or vary
        finalLightness,
        colorMode,
      ),
    );

    // Interpolate if more colors are needed than parts generated
    const finalPaletteHex = this.interpolatePalette(
      colorsHex,
      count,
      colorMode,
    );

    return finalPaletteHex.map((hex) => toIColor(hex || "#000000")); // Convert valid hex strings to IColor
  }

  /**
   * Generate palette using a legacy algorithm approach.
   * Creates color ramps with controlled progression.
   * @param options - Configuration options. Requires `count`.
   * @returns An array of IColor objects.
   */
  public generateLegacyPalette(options: AlgorithmicGeneratorOptions): Palette {
    const {
      count,
      parts = 4,
      minHueDiffAngle = 60,
      colorMode = "oklch",
      seed,
    } = options;
    if (seed && !this.rnd) this.rnd = new Seedrandom(seed);

    const colorsHex: string[] = [];
    const actualParts = Math.max(2, Math.min(count, parts)); // Ensure parts >= 2
    const partSize = Math.floor(count / actualParts);
    const remainder = count % actualParts;

    // Generate base hues
    const baseHue = this.random(0, 359);
    const numHues = Math.max(2, Math.floor(360 / minHueDiffAngle));
    const hueStep = 360 / numHues;
    const availableHues = Array.from(
      { length: numHues },
      (_, i) => (baseHue + i * hueStep) % 360,
    );
    const hues = shuffleArray(availableHues, this.rnd); // Use available hues

    // Create first color (low saturation, variable lightness)
    const baseSaturation = this.random(10, 35);
    const startLightness = this.random(15, 30);
    const endLightness = this.random(80, 95);
    const rangeLightness = endLightness - startLightness;

    colorsHex.push(
      coordsToHex(
        hues[0],
        baseSaturation,
        startLightness * this.random(0.8, 1.2),
        colorMode,
      ),
    );

    // Generate lightness ramp for the first part
    const firstPartCount = partSize + (remainder > 0 ? 1 : 0); // Distribute remainder
    for (let i = 1; i < firstPartCount; i++) { // Start from 1 as first color is added
      // Use power curve for non-linear lightness progression
      const progress = i / (firstPartCount - 1);
      const lightness = startLightness +
        rangeLightness * Math.pow(progress, 1.5);
      colorsHex.push(
        coordsToHex(
          hues[0],
          baseSaturation * this.random(0.9, 1.1),
          lightness,
          colorMode,
        ),
      );
    }

    // Add random saturated colors for the remaining parts
    const midSatMin = this.random(50, 70);
    const midSatMax = midSatMin + 25; // Slightly tighter range
    const midLightMin = this.random(45, 65);
    const midLightMax = this.random(70, 90);

    let currentCount = firstPartCount;
    for (let p = 1; p < actualParts; p++) { // Iterate through remaining parts
      const currentPartCount = partSize + (p < remainder ? 1 : 0); // Distribute remainder
      const partHue = hues[p % hues.length]; // Cycle through hues

      for (let i = 0; i < currentPartCount && currentCount < count; i++) {
        colorsHex.push(
          coordsToHex(
            partHue,
            this.random(midSatMin, midSatMax),
            this.random(midLightMin, midLightMax),
            colorMode,
          ),
        );
        currentCount++;
      }
    }

    // Ensure palette has exactly 'count' colors, trim if needed
    const finalPaletteHex = colorsHex.slice(0, count);

    return finalPaletteHex.map((hex) => toIColor(hex || "#000000"));
  }

  /**
   * Generate palette using Simplex noise for smooth transitions.
   * @param options - Configuration options. Requires `count`.
   * @returns An array of IColor objects.
   */
  public generateSimplexNoisePalette(
    options: AlgorithmicGeneratorOptions,
  ): Palette {
    const { count, minHueDiffAngle = 60, colorMode = "oklch", seed } = options;
    if (seed && !this.simplex) {
      this.simplex = new SimplexNoise(new Seedrandom(seed)()); // Re-seed if provided
    }

    const colorsHex: string[] = [];

    // Define ranges for Lightness and Saturation
    const minLight = this.random(15, 30);
    const maxLight = this.random(80, 95);
    const lightRange = maxLight - minLight;

    const minSat = this.random(30, 50);
    const maxSat = this.random(75, 95);
    const satRange = maxSat - minSat;

    const noiseScaleHue = 0.8; // Controls frequency of hue change
    const noiseScaleSat = 1.5; // Controls frequency of saturation change
    const noiseScaleLight = 1.2; // Controls frequency of lightness change
    const time = this.random(0, 100); // Offset noise sampling point

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1 || 1); // Normalized position [0, 1]

      // Generate noise values for H, S, L independently
      // Using 3D noise with t as one dimension for smoother transitions
      const hueNoise = (this.simplex.noise3D(t * noiseScaleHue, time, 0) + 1) /
        2; // Noise in [0, 1]
      const satNoise =
        (this.simplex.noise3D(t * noiseScaleSat, time + 10, 10) + 1) / 2;
      const lightNoise =
        (this.simplex.noise3D(t * noiseScaleLight, time + 20, 20) + 1) / 2;

      // Map noise to color parameters
      // Use minHueDiffAngle to constrain hue range variation if desired, but Simplex naturally smooths
      const hue = (hueNoise * 360) % 360;
      const saturation = minSat + satNoise * satRange;
      const lightness = minLight + lightNoise * lightRange;

      colorsHex.push(coordsToHex(hue, saturation, lightness, colorMode));
    }

    return colorsHex.map((hex) => toIColor(hex || "#000000"));
  }

  /**
   * Generate palette using the randomcolor library.
   * @param options - Configuration options. Requires `count`.
   * @returns An array of IColor objects.
   */
  public generateRandomColorJsPalette(
    options: AlgorithmicGeneratorOptions,
  ): Palette {
    const { count, seed } = options;
    const colorsHex = randomColor({
      count: count,
      seed: seed,
      // Add other randomcolor options if needed, e.g., luminosity, hue
      luminosity: "random", // Example option
      hue: "random", // Example option
    });
    // Explicitly type 'hex' as string to resolve implicit any
    return colorsHex.map((hex: string) => toIColor(hex || "#000000"));
  }

  /**
   * Interpolates between key colors if the generated parts are fewer than the required count.
   * @param keyColorsHex - Array of hex strings representing the key colors.
   * @param targetCount - The final number of colors desired.
   * @param mode - The color mode for interpolation ('lab', 'lch', 'rgb', etc.).
   * @returns Array of hex strings for the final palette.
   * @private
   */
  private interpolatePalette(
    keyColorsHex: string[],
    targetCount: number,
    mode: string = "lch",
  ): string[] {
    if (keyColorsHex.length >= targetCount) {
      return keyColorsHex.slice(0, targetCount); // Return subset if already enough
    }
    if (keyColorsHex.length < 2) {
      // Cannot interpolate with fewer than 2 colors, duplicate or return as is
      return Array(targetCount).fill(keyColorsHex[0] || "#000000");
    }

    // Filter out any invalid hex strings before creating scale
    const validKeyColors = keyColorsHex.filter((hex) => {
      try {
        chroma(hex); // Check if chroma can parse it
        return true;
      } catch {
        return false;
      }
    });

    if (validKeyColors.length < 2) {
      // Handle case with < 2 valid key colors after filtering
      console.warn("Need at least 2 valid key colors for interpolation.");
      return Array(targetCount).fill(validKeyColors[0] || "#000000");
    }

    // Create a chroma.js scale
    const scale = chroma.scale(validKeyColors).mode(mode).colors(targetCount);
    return scale;
  }

  /**
   * Main palette generation method that routes to specific algorithms.
   *
   * @param method - Algorithm name ("HueBingo", "Legacy", "SimplexNoise", "RandomColorJs"). Case-insensitive.
   * @param options - Generation options conforming to AlgorithmicGeneratorOptions.
   * @returns An array of IColor objects representing the generated palette.
   *
   * @example
   * const generator = new AlgorithmicPaletteGenerator("mySeed123");
   * const bingoOptions: AlgorithmicGeneratorOptions = { count: 7, parts: 4, colorMode: 'oklch', minHueDiffAngle: 50 };
   * const bingoPalette = generator.generatePalette("HueBingo", bingoOptions);
   *
   * const simplexOptions: AlgorithmicGeneratorOptions = { count: 10, colorMode: 'lch' };
   * const simplexPalette = generator.generatePalette("SimplexNoise", simplexOptions);
   */
  public generatePalette(
    method: string,
    options: AlgorithmicGeneratorOptions,
  ): Palette {
    let colors: Palette = [];
    const { randomOrder = false } = options; // Default randomOrder to false

    // Use a case-insensitive match for the method name
    switch (method.toLowerCase()) {
      case "huebingo":
      case "hue bingo":
        colors = this.generateHueBingoPalette(options);
        break;
      case "legacy":
        colors = this.generateLegacyPalette(options);
        break;
        // case "fullrandom": // This was in the original, potentially implement if needed
        // colors = this.generateRandomPalette(options);
        // break;
      case "simplexnoise":
      case "simplex noise":
        colors = this.generateSimplexNoisePalette(options);
        break;
      case "randomcolorjs":
      case "randomcolor.js":
        colors = this.generateRandomColorJsPalette(options);
        break;
      default:
        console.warn(
          `Unknown generation method "${method}". Falling back to Legacy.`,
        );
        colors = this.generateLegacyPalette(options);
    }

    // Apply random shuffling if requested
    if (randomOrder) {
      colors = shuffleArray(colors, this.rnd);
    }

    // Ensure the final palette has the exact requested count
    if (colors.length !== options.count) {
      // If too few, interpolate; if too many, slice.
      if (colors.length > 1 && colors.length < options.count) {
        const hexColors = colors.map((c) => c.hex);
        const interpolatedHex = this.interpolatePalette(
          hexColors,
          options.count,
          options.colorMode || "lch",
        );
        return interpolatedHex.map((hex) => toIColor(hex || "#000000"));
      } else {
        return colors.slice(0, options.count);
      }
    }

    return colors;
  }
}
