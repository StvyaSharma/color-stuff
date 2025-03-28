/**
 * Color Palette Generator Library
 * =================================
 *
 * This library provides functions to generate intelligent color palettes
 * (complementary, analogous, triadic, tetradic, monochromatic, gradient-based)
 * tailored for design applications. The implementation is based on established color theory,
 * including:
 *
 * - Itten's color interaction theory (see https://en.wikipedia.org/wiki/Josef_Albers and https://en.wikipedia.org/wiki/Color_theory)
 * - Goethe's foundational studies on color perception (see https://www.siggraph.org/education/materials/HyperGraph/color.html)
 * - Modern Munsell color system (see https://en.wikipedia.org/wiki/Munsell_color_system)
 * - WCAG 2.1 guidelines for contrast and accessibility (see https://www.w3.org/TR/WCAG21/)
 *
 * The library supports input color formats of HEX, RGB, and HSL and provides robust error handling,
 * color space conversions, color-blindness simulation (protanopia simulation here as an example),
 * and adjustable palette generation based on mood/theme.
 *
 * Author: Your Name
 * Date: 2025-02-16
 *
 * License: MIT License
 */

/** Interfaces for supported color models. */
export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // Hue: 0°–360°
  s: number; // Saturation: 0–100%
  l: number; // Lightness: 0–100%
}

/** Interface for the color palette output. */
export interface ColorPalette {
  base: HSL;
  complementary: HSL;
  analogous: HSL[];
  triadic: HSL[];
  tetradic: HSL[];
  monochromatic: HSL[];
  gradient: HSL[];
  contrastRatio: number;
  accessible: boolean;
}

/**
 * Parse input color which can be in hex, RGB, or HSL format and returns an HSL color.
 *
 * @param color - The color input as a string (HEX) or an object (RGB or HSL)
 * @returns HSL color representation
 * @throws {Error} If the input format is invalid.
 */
export function parseColor(color: string | RGB | HSL): HSL {
  if (typeof color === "string") {
    return hexToHSL(color);
  } else if ("r" in color && "g" in color && "b" in color) {
    return rgbToHSL(color);
  } else if ("h" in color && "s" in color && "l" in color) {
    return color as HSL;
  }
  throw new Error(
    "Unsupported color format. Use hex string, RGB, or HSL object.",
  );
}

/**
 * Convert HEX to HSL.
 *
 * @param hex - HEX color string e.g., "#ff5733" or "ff5733"
 * @returns HSL color representation.
 */
export function hexToHSL(hex: string): HSL {
  // Remove leading '#' if present
  hex = hex.replace(/^#/, "");
  if (hex.length !== 6) {
    throw new Error("Invalid HEX color format.");
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return rgbToHSL({ r, g, b });
}

/**
 * Convert RGB to HSL.
 *
 * The conversion is based on the formulas described here:
 * https://en.wikipedia.org/wiki/HSL_and_HSV#From_RGB
 *
 * @param rgb - RGB object representation
 * @returns HSL color representation.
 */
export function rgbToHSL(rgb: RGB): HSL {
  let { r, g, b } = rgb;
  // Normalize to 0-1 range
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60; // Convert to degrees
  }

  return { h, s: s * 100, l: l * 100 };
}

/**
 * Convert HSL to RGB.
 *
 * Based on the algorithm described here:
 * https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB_alternative
 *
 * @param hsl - HSL color representation
 * @returns RGB color representation.
 */
export function hslToRGB(hsl: HSL): RGB {
  let { h, s, l } = hsl;
  s /= 100;
  l /= 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Calculate the relative luminance of an HSL color.
 *
 * Uses the WCAG definition for relative luminance.
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 *
 * @param hsl - HSL color representation
 * @returns Relative luminance value.
 */
export function getRelativeLuminance(hsl: HSL): number {
  // Convert HSL to RGB first
  const rgb = hslToRGB(hsl);
  const srgb = [rgb.r, rgb.g, rgb.b].map((val) => {
    let n = val / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  // Calculate luminance based on Rec. 709 coefficients
  return srgb[0] * 0.2126 + srgb[1] * 0.7152 + srgb[2] * 0.0722;
}

/**
 * Calculates contrast ratio between two HSL colors.
 *
 * Ratio calculation follows WCAG 2.1 guidelines:
 * https://www.w3.org/TR/WCAG21/#contrast-minimum
 *
 * @param hsl1 - First HSL color
 * @param hsl2 - Second HSL color
 * @returns Contrast ratio, a number between 1 and 21.
 */
export function calculateContrastRatio(hsl1: HSL, hsl2: HSL): number {
  const lum1 = getRelativeLuminance(hsl1);
  const lum2 = getRelativeLuminance(hsl2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Check if the contrast ratio meets WCAG 2.1 guidelines.
 *
 * For normal text, a contrast ratio of at least 4.5:1 is required.
 *
 * @param contrastRatio - The contrast ratio between two colors.
 * @returns True if compliant, otherwise false.
 */
export function isWCAGCompliant(contrastRatio: number): boolean {
  return contrastRatio >= 4.5;
}

/**
 * Generate complementary color.
 *
 * Based on the concept that the complementary hue is 180 degrees apart.
 * Reference: Itten’s color theory (https://en.wikipedia.org/wiki/Color_theory)
 *
 * @param base - Base HSL color.
 * @returns Complementary HSL color.
 */
export function generateComplementary(base: HSL): HSL {
  return { ...base, h: (base.h + 180) % 360 };
}

/**
 * Generate analogous colors.
 *
 * Creates two analogous colors by adding and subtracting 30° from the hue.
 *
 * @param base - Base HSL color.
 * @param angle - Angle increment (default 30°).
 * @returns Array with two analogous HSL colors.
 */
export function generateAnalogous(base: HSL, angle: number = 30): HSL[] {
  const analogous1 = { ...base, h: (base.h + angle) % 360 };
  const analogous2 = { ...base, h: (base.h - angle + 360) % 360 };
  return [analogous1, analogous2];
}

/**
 * Generate triadic colors.
 *
 * Produces two colors by partitioning the color wheel into thirds.
 *
 * @param base - Base HSL color.
 * @returns Array with two triadic HSL colors.
 */
export function generateTriadic(base: HSL): HSL[] {
  const triadic1 = { ...base, h: (base.h + 120) % 360 };
  const triadic2 = { ...base, h: (base.h + 240) % 360 };
  return [triadic1, triadic2];
}

/**
 * Generate tetradic colors.
 *
 * Creates a tetradic (double complementary) scheme with two complementary pairs.
 *
 * @param base - Base HSL color.
 * @returns Array with three additional HSL colors.
 */
export function generateTetradic(base: HSL): HSL[] {
  // First complementary pair
  const comp = generateComplementary(base);
  // Offset hues by 60° for variation
  const tetradic1 = { ...base, h: (base.h + 60) % 360 };
  const tetradic2 = { ...comp, h: (comp.h + 60) % 360 };
  return [comp, tetradic1, tetradic2];
}

/**
 * Generate monochromatic palette.
 *
 * Varies the lightness of the base color to produce a range of shades.
 *
 * @param base - Base HSL color.
 * @param steps - Number of shades (default 5).
 * @returns Array with HSL shades.
 */
export function generateMonochromatic(base: HSL, steps: number = 5): HSL[] {
  const shades: HSL[] = [];
  const stepSize = 100 / (steps + 1);
  // Create darker and lighter variations
  for (let i = 1; i <= steps; i++) {
    let newL = base.l - stepSize * i;
    newL = Math.max(0, Math.min(100, newL));
    shades.push({ ...base, l: newL });
  }
  return shades;
}

/**
 * Generate a gradient between two HSL colors.
 *
 * Creates a linear interpolation from the base color to the target color.
 *
 * @param base - Base HSL color.
 * @param target - Target HSL color.
 * @param steps - Number of intermediate steps (default 5).
 * @returns Array of HSL colors forming a gradient.
 */
export function generateGradient(
  base: HSL,
  target: HSL,
  steps: number = 5,
): HSL[] {
  const gradient: HSL[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const interpolated: HSL = {
      h: interpolateHue(base.h, target.h, t),
      s: base.s + (target.s - base.s) * t,
      l: base.l + (target.l - base.l) * t,
    };
    gradient.push(interpolated);
  }
  return gradient;
}

/**
 * Helper function to interpolate between two hue values.
 *
 * @param h1 - Starting hue.
 * @param h2 - Ending hue.
 * @param t - Interpolation factor (0 to 1).
 * @returns Interpolated hue.
 */
function interpolateHue(h1: number, h2: number, t: number): number {
  let delta = ((h2 - h1 + 540) % 360) - 180;
  return (h1 + delta * t + 360) % 360;
}

/**
 * Simulate color blindness (protanopia) for a given HSL color.
 *
 * This is a simplified simulation based on matrix transformation in the RGB space.
 *
 * @param hsl - HSL color
 * @returns Simulated HSL color for protanopia.
 */
export function simulateProtanopia(hsl: HSL): HSL {
  // Convert to RGB for matrix transformation
  const rgb = hslToRGB(hsl);
  // Simplified protanopia simulation matrix adapted for demonstration
  const r = rgb.r * 0.56667 + rgb.g * 0.43333;
  const g = rgb.r * 0.55833 + rgb.g * 0.44167;
  const b = rgb.b;
  return rgbToHSL({
    r: Math.min(255, r),
    g: Math.min(255, g),
    b: Math.min(255, b),
  });
}

/**
 * Generate a dynamic color palette based on the base color and optional mood adjustments.
 *
 * @param baseColor - The input color (supports hex, RGB, or HSL).
 * @param mood - Optional mood/theme adjustment: "warm", "cool", or "neutral" (default "neutral").
 * @returns Generated ColorPalette.
 */
export function generateColorPalette(
  baseColor: string | RGB | HSL,
  mood: "warm" | "cool" | "neutral" = "neutral",
): ColorPalette {
  const baseHSL = parseColor(baseColor);

  // Adjust mood
  let adjustedBase = { ...baseHSL };
  if (mood === "warm") {
    adjustedBase.s = Math.min(100, baseHSL.s + 10);
    adjustedBase.l = Math.min(100, baseHSL.l + 5);
  } else if (mood === "cool") {
    adjustedBase.s = Math.max(0, baseHSL.s - 10);
    adjustedBase.l = Math.max(0, baseHSL.l - 5);
  }

  const complementary = generateComplementary(adjustedBase);
  const analogous = generateAnalogous(adjustedBase);
  const triadic = generateTriadic(adjustedBase);
  const tetradic = generateTetradic(adjustedBase);
  const monochromatic = generateMonochromatic(adjustedBase);
  const gradient = generateGradient(adjustedBase, complementary);

  const contrastRatio = calculateContrastRatio(adjustedBase, complementary);
  const accessible = isWCAGCompliant(contrastRatio);

  return {
    base: adjustedBase,
    complementary,
    analogous,
    triadic,
    tetradic,
    monochromatic,
    gradient,
    contrastRatio,
    accessible,
  };
}

// If this module is run as a standalone script, execute an example.
//   if (import.meta.main) {
const examplePalette = generateColorPalette("#3498db", "warm");
console.log("Generated Palette:", examplePalette);
//   }
