/**
 * Interface defining options for color palette generation
 */
export interface ColorGeneratorOptions {
  /** Total number of colors to generate */
  total: number;
  /** Color mode to use (e.g. "hsluv", "hsl", etc) */
  mode?: string;
  /** Padding between colors */
  padding?: number;
  /** Number of distinct color sections */
  parts?: number;
  /** Whether to randomize the order of generated colors */
  randomOrder?: boolean;
  /** Minimum angle between different hues */
  minHueDiffAngle?: number;
  /** Color space to use for generation */
  colorMode?: string;
  /** Random seed for reproducible results */
  seed?: string;
}

// Import required color manipulation libraries
import { hpluvToHex, hsluvToHex } from "hsluv";
import chroma from "chroma-js";
import Seedrandom from "seedrandom";
import SimplexNoise from "simplex-noise";
import randomColor from "randomcolor";

/**
 * Converts color coordinates to hex string based on color mode
 * @param angle - Hue angle (0-360)
 * @param val1 - Saturation/Chroma (0-100)
 * @param val2 - Lightness/Value (0-100)
 * @param mode - Color space mode
 * @returns Hex color string
 */
export function coordsToHex(
  angle: number,
  val1: number,
  val2: number,
  mode = "hsluv",
): string {
  if (mode === "hsluv") {
    return hsluvToHex([angle, val1, val2]);
  } else if (mode === "hpluv") {
    return hpluvToHex([angle, val1, val2]);
  } else if (mode === "hcl") {
    return chroma(angle, val1, val2, "hcl").hex();
  } else if (mode === "lch") {
    return chroma(val2, val1, angle, "lch").hex();
  } else if (mode === "oklch") {
    return chroma(val2 / 100 * 0.999, val1 / 100 * 0.322, angle, "oklch").hex();
  } else if (mode === "hsl" || mode === "hsv" || mode === "hcg") {
    return chroma(angle, val1 / 100, val2 / 100, mode).hex();
  }
  return "";
}

/**
 * Randomly shuffles array elements using Fisher-Yates algorithm
 * @param arr - Array to shuffle
 * @returns Shuffled array
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const array = [...arr];
  let currentIndex = array.length;

  while (currentIndex > 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

/**
 * Main class for generating color palettes using different algorithms
 */
export class ColorPaletteGenerator {
  private rnd: Seedrandom.PRNG;

  /**
   * Initialize generator with optional random seed
   */
  constructor(seed?: string) {
    this.rnd = new Seedrandom(seed);
  }

  /**
   * Generate random number in range
   * @param min - Minimum value
   * @param max - Maximum value
   */
  private random(min = 1, max?: number): number {
    if (!max) {
      return this.rnd() * min;
    }
    return Math.floor(this.rnd() * (max - min + 1)) + min;
  }

  /**
   * Generate palette using "Hue Bingo" algorithm
   * Creates harmonious colors with controlled hue spacing
   */
  generateHueBingoPalette(options: ColorGeneratorOptions): string[] {
    const { total, parts = 4, minHueDiffAngle = 60, colorMode = "hsluv" } =
      options;
    const colors: string[] = [];

    // Create array of evenly spaced hues
    const baseHue = this.random(0, 360);
    const hues = new Array(Math.round(360 / minHueDiffAngle))
      .fill("")
      .map((_, i) => (baseHue + i * minHueDiffAngle) % 360);

    // Generate first low saturation color
    const baseSaturation = this.random(5, 40);
    const baseLightness = this.random(0, 20);
    const rangeLightness = 90 - baseLightness;

    colors.push(
      coordsToHex(
        hues[0],
        baseSaturation,
        baseLightness * this.random(0.25, 0.75),
        colorMode,
      ),
    );

    // Generate middle colors with random saturations
    const minSat = this.random(50, 70);
    const maxSat = minSat + 30;
    const minLight = this.random(35, 70);
    const maxLight = Math.min(minLight + this.random(20, 40), 95);

    const remainingHues = [...hues];

    for (let i = 0; i < parts - 2; i++) {
      const hue =
        remainingHues.splice(this.random(0, remainingHues.length - 1), 1)[0];
      const saturation = this.random(minSat, maxSat);
      const light = baseLightness + this.random(0, 10) +
        ((rangeLightness / (parts - 1)) * i);

      colors.push(
        coordsToHex(
          hue,
          saturation,
          this.random(light, maxLight),
          colorMode,
        ),
      );
    }

    // Generate final light color
    colors.push(
      coordsToHex(
        remainingHues[0],
        baseSaturation,
        rangeLightness + 10,
        colorMode,
      ),
    );

    return colors;
  }

  /**
   * Generate palette using legacy algorithm
   * Creates color ramps with controlled progression
   */
  generateLegacyPalette(options: ColorGeneratorOptions): string[] {
    const { total, parts = 4, minHueDiffAngle = 60, colorMode = "hsluv" } =
      options;
    const colors: string[] = [];

    const part = Math.floor(total / parts);
    const reminder = total % parts;

    // Generate base hues
    const baseHue = this.random(0, 360);
    const hues = new Array(Math.round(360 / minHueDiffAngle))
      .fill("")
      .map((_, i) => (baseHue + i * minHueDiffAngle) % 360);

    // Create first low saturation color
    const baseSaturation = this.random(5, 40);
    const baseLightness = this.random(0, 20);
    const rangeLightness = 90 - baseLightness;

    colors.push(
      coordsToHex(
        hues[0],
        baseSaturation,
        baseLightness * this.random(0.25, 0.75),
        colorMode,
      ),
    );

    // Generate lightness ramp
    for (let i = 0; i < (part - 1); i++) {
      colors.push(
        coordsToHex(
          hues[0],
          baseSaturation,
          baseLightness + (rangeLightness * Math.pow(i / (part - 1), 1.5)),
          colorMode,
        ),
      );
    }

    // Add random saturated colors
    const minSat = this.random(50, 70);
    const maxSat = minSat + 30;
    const minLight = this.random(45, 80);
    const maxLight = Math.min(minLight + 40, 95);

    for (let i = 0; i < (part + reminder - 1); i++) {
      colors.push(
        coordsToHex(
          hues[this.random(0, hues.length - 1)],
          this.random(minSat, maxSat),
          this.random(minLight, maxLight),
          colorMode,
        ),
      );
    }

    // Add final light color
    colors.push(
      coordsToHex(
        hues[0],
        baseSaturation,
        rangeLightness,
        colorMode,
      ),
    );

    return colors;
  }

  /**
   * Generate completely random palette
   * No color harmony rules applied
   */
  generateRandomPalette(options: ColorGeneratorOptions): string[] {
    const { parts = 4, colorMode = "hsluv" } = options;
    const colors: string[] = [];

    for (let i = 0; i < parts; i++) {
      colors.push(
        coordsToHex(
          this.random(0, 360),
          this.random(0, 100),
          this.random(0, 100),
          colorMode,
        ),
      );
    }

    return colors;
  }

  /**
   * Generate palette using Simplex noise
   * Creates smooth transitions between colors
   */
  generateSimplexNoisePalette(options: ColorGeneratorOptions): string[] {
    const { parts = 4, minHueDiffAngle = 60, colorMode = "hsluv", seed } =
      options;
    const colors: string[] = [];

    const simplex = new SimplexNoise(seed);

    const minLight = this.random(50, 80);
    const maxLight = Math.min(minLight + 40, 95);
    const minSat = this.random(20, 80);
    const maxSat = this.random(80, 100);
    const satRamp = maxSat - minSat;

    for (let i = 0; i < parts + 1; i++) {
      colors.push(
        coordsToHex(
          simplex.noise2D(.5, (i / parts) * (3 * (minHueDiffAngle / 360))) *
            360,
          minSat + (i / parts) * satRamp,
          i ? 55 + i / parts * (maxLight - minLight) : this.random(10, 40),
          colorMode,
        ),
      );
    }

    return colors;
  }

  /**
   * Generate palette using RandomColor.js library
   */
  generateRandomColorJsPalette(options: ColorGeneratorOptions): string[] {
    const { parts = 4, seed } = options;

    return [
      randomColor({
        luminosity: "dark",
        seed: seed,
      }),
      ...randomColor({
        seed: seed + "50",
        count: parts - 2,
      }),
      randomColor({
        luminosity: "light",
        seed: seed + "100",
      }),
    ];
  }

  /**
   * Main palette generation method that routes to specific algorithms
   * @param method - Algorithm to use
   * @param options - Generation options
   * @returns Array of hex color strings
   *
   * @example
   * const generator = new ColorPaletteGenerator("seed123");
   * const colors = generator.generatePalette("Hue Bingo", {
   *   total: 5,
   *   parts: 3,
   *   colorMode: "hsluv",
   *   minHueDiffAngle: 60
   * });
   * // Returns: ["#123456", "#789abc", "#def012", ...]
   */
  generatePalette(method: string, options: ColorGeneratorOptions): string[] {
    let colors: string[];

    switch (method) {
      case "Hue Bingo":
        colors = this.generateHueBingoPalette(options);
        break;
      case "Legacy":
        colors = this.generateLegacyPalette(options);
        break;
      case "Full Random":
        colors = this.generateRandomPalette(options);
        break;
      case "Simplex Noise":
        colors = this.generateSimplexNoisePalette(options);
        break;
      case "RandomColor.js":
        colors = this.generateRandomColorJsPalette(options);
        break;
      default:
        colors = this.generateLegacyPalette(options);
    }

    if (options.randomOrder) {
      colors = shuffleArray(colors);
    }

    return colors;
  }
}
