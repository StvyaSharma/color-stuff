/**
 * @file gradients/gradient.types.ts
 * Defines types and interfaces related to gradient generation.
 */
import type { ColorInput, IColor } from "../core/color.types.ts";

/** Supported gradient types. */
export type GradientType = "linear" | "radial" | "angular" | "blob";

/** Represents a color stop in a gradient, including its position. */
export interface ColorStop {
  color: IColor;
  /** Position of the stop along the gradient (0.0 to 1.0). Optional, defaults to equidistant. */
  position?: number;
}

// --- BEGIN FIX ---
// Define the specific color spaces supported by interpolateColor's 'mode' parameter
export type InterpolationColorSpace =
  | "lab"
  | "lch"
  | "oklab"
  | "lrgb"
  | "hsl"
  | "rgb";
// --- END FIX ---

/** Options for controlling gradient interpolation. */
export interface InterpolationOptions {
  /** The number of discrete color steps to generate in the output gradient. */
  steps: number;
  /**
   * Specifies the color space for interpolation.
   * Defaults to 'lch'.
   * ('linear' and 'bezier' are interpolation *methods/easings*, not color spaces,
   * and should be handled separately if needed by the interpolation function).
   */
  // --- BEGIN FIX ---
  colorMode?: InterpolationColorSpace; // Use the restricted type that interpolateColor accepts
  // --- END FIX ---
  /**
   * NOTE: 'linear' and 'bezier' removed from colorMode. If needed, add a separate
   * 'easing' or 'interpolationMethod' option and update interpolateColor accordingly.
   * For 'bezier' mode, control points can be specified.
   * For other modes, could potentially be used for non-uniform step distribution (not standard chroma use).
   */
  // controlPoints?: number[]; // Revisit if needed for custom step distribution
}

/** Options common to all gradient generation requests. */
export interface GradientOptions extends InterpolationOptions {
  /**
   * An array of colors defining the gradient stops.
   * Can be IColor objects, hex strings, RGB objects, etc. (will be converted to IColor).
   * Or can be ColorStop objects with explicit positions.
   */
  colors: (ColorInput | ColorStop)[];
  /**
   * Optional angle for linear gradients (degrees, 0-360).
   * Optional starting angle for angular (conic) gradients (degrees).
   * Default is often 180deg (top to bottom) for linear.
   */
  angle?: number;
  /**
   * Optional focal point for radial gradients [x, y] in relative coordinates (0-1).
   * Default is center [0.5, 0.5].
   */
  focalPoint?: [number, number];
  /**
   * Optional shape for radial gradients.
   */
  radialShape?: "circle" | "ellipse";
  /**
   * Optional factor for introducing randomness in 'blob' gradients (0-1).
   * Higher values mean more deviation from linear interpolation.
   */
  noiseFactor?: number;
}

/** Output structure for gradient generation. */
export interface GradientOutput {
  /** Array of generated IColor steps. */
  gradient: IColor[];
  /** Metadata about the generation process, like perceptual distances between steps. */
  metadata?: GradientMetadata;
  /** Generated CSS string representation of the gradient. */
  css: string;
  /** Generated SVG definition string (if applicable, e.g., for linear/radial). */
  svg?: string;
}

/** Metadata associated with a generated gradient. */
export interface GradientMetadata {
  /** Perceptual distance (DeltaE 2000) between consecutive steps. */
  perceptualDistances?: number[];
  /** Average perceptual distance. */
  averageDistance?: number;
  /** Contrast ratio between consecutive steps (less common metric for gradients). */
  contrastRatios?: (number | null)[];
}
