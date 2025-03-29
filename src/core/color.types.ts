/**
 * @file core/color.types.ts
 * Defines core color interfaces used throughout the library.
 */
import chroma from "chroma-js";
/**
 * Represents a color in RGB format (0-255).
 */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

/**
 * Represents a color in HSL format.
 */
export interface HSL {
  h: number; // Hue, in degrees [0, 360)
  s: number; // Saturation, as a percentage [0, 100]
  l: number; // Lightness, as a percentage [0, 100]
}

/**
 * Represents a color in CIELAB space.
 */
export interface Lab {
  L: number; // Lightness (0-100)
  a: number; // Green-red axis
  b: number; // Blue-yellow axis
}

/**
 * Represents a color in OkLab space.
 * A perceptually uniform color space.
 * @see https://bottosson.github.io/posts/oklab/
 */
export interface OkLab {
  L: number; // Perceived Lightness
  a: number; // Green-red axis
  b: number; // Blue-yellow axis
}

/**
 * Interface representing a color with multiple formats.
 * This is the primary internal representation for colors.
 */
export interface IColor {
  /** Hexadecimal representation (e.g., "#RRGGBB"). */
  hex: string;
  /** RGB representation [r, g, b] with values 0-255. */
  rgb: [number, number, number];
  /** HSL representation [h, s, l]. Hue 0-360, Sat/Lightness 0-100. */
  hsl: [number, number, number];
  /** CIELAB representation [L*, a*, b*]. */
  lab: [number, number, number];
  /** OkLab representation [L, a, b]. */
  oklab: [number, number, number];
  /** Alpha channel (0-1). */
  alpha: number;
}

/** Type alias for a palette, which is an array of IColor objects. */
export type Palette = IColor[];

/** Input type for color conversion functions, allowing flexibility. */
export type ColorInput =
  | string
  | RGB
  | HSL
  | Lab
  | OkLab
  | IColor
  | [number, number, number]
  | number[]
  | chroma.Color;
