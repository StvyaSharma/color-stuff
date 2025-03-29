/**
 * @file palettes/palette.types.ts
 * Defines types related to palette generation.
 */
import type { IColor } from "../core/color.types.ts";

/** Alias for a palette represented as an array of IColor objects. */
export type Palette = IColor[];

/** Options for palette generation algorithms */
export interface PaletteGeneratorOptions {
  /** The desired number of colors in the final palette. */
  count: number;
  /** An optional seed color to base the palette on. */
  seedColor?: IColor | string;
  /** Optional parameters specific to the generation method. */
  [key: string]: any; // Allow for additional method-specific options
}

/** Options specifically for algorithmic generators like Hue Bingo, Legacy, Simplex */
export interface AlgorithmicGeneratorOptions extends PaletteGeneratorOptions {
  /** Hue angle separation for distinct colors. */
  minHueDiffAngle?: number;
  /** Number of distinct color sections or parts expected. */
  parts?: number;
  /** Color generation mode/space (e.g., 'hsluv', 'lch', 'oklch'). */
  colorMode?: string;
  /** Random seed for reproducible results. */
  seed?: string;
  /** Whether to randomize the order of generated colors. */
  randomOrder?: boolean;
}

/** Options for Data Visualization palette generation */
export interface DataVizGeneratorOptions extends PaletteGeneratorOptions {
  /** Number of random candidate colors to sample from. Higher values increase quality but decrease performance. */
  samples?: number;
  /** The minimum perceptual distance (e.g., DeltaE) desired between colors in the palette. */
  minDistanceThreshold?: number;
  /** Target background color for contrast checks. */
  backgroundColor?: IColor | string;
}

/** Options for Harmony-Based palette generation */
export interface HarmonyGeneratorOptions extends PaletteGeneratorOptions {
  /** The type of harmony rule to apply (e.g., 'complementary', 'analogous', 'triadic'). */
  harmonyRule:
    | "complementary"
    | "analogous"
    | "triadic"
    | "tetradic"
    | "splitComplementary"
    | "square"
    | "monochromatic";
  /** Optional: Angle for analogous harmony (degrees). */
  analogousAngle?: number;
  /** Optional: Number of steps for monochromatic palettes. */
  monochromaticSteps?: number;
}

/** Options for Interaction-Based palette generation */
export interface InteractionGeneratorOptions extends PaletteGeneratorOptions {
  /** The interaction model to use ('relativity' or 'subtraction'). */
  interactionModel: "relativity" | "subtraction";
  /** For subtraction model: the ground color influencing the palette. */
  groundColor?: IColor | string;
  /** For subtraction model: the factor controlling the subtraction intensity. */
  subtractionFactor?: number;
  /** For relativity model: initial surrounding colors (optional). */
  initialSurroundings?: (IColor | string)[];
}
