/**
 * @file core/conversions.ts
 * Centralized color conversion functions. Handles conversions between
 * various color spaces (Hex, RGB, HSL, Lab, OkLab) and the internal IColor format.
 */

import chroma, { Color } from "chroma-js";
import type {
  ColorInput,
  HSL,
  IColor,
  Lab,
  OkLab,
  RGB,
} from "./color.types.ts";
import { clamp } from "../utils/math";

// --- sRGB <-> Linear RGB ---

/**
 * Converts an sRGB component (0-255) to linear RGB (0-1).
 * Uses the standard sRGB companding function.
 * @param component - sRGB value (0-255).
 * @returns Linear RGB value (0-1).
 * @private
 */
function srgbToLinear(component: number): number {
  const c = clamp(component, 0, 255) / 255.0;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Converts a linear RGB component (0-1) back to sRGB (0-255).
 * Uses the inverse of the standard sRGB companding function.
 * @param linear - Linear RGB value (0-1).
 * @returns sRGB value (0-255), rounded.
 * @private
 */
function linearToSrgb(linear: number): number {
  const clampedLinear = clamp(linear, 0, 1);
  const cs = clampedLinear <= 0.0031308
    ? clampedLinear * 12.92
    : 1.055 * Math.pow(clampedLinear, 1 / 2.4) - 0.055;
  return clamp(Math.round(cs * 255), 0, 255);
}

// --- RGB -> OkLab / OkLab -> RGB ---

// Constants for OkLab conversion matrices
const M1: number[][] = [
  [+0.8356741076, +0.3681084190, -0.1285469696],
  [-0.2896913731, +1.1908023930, +0.0988890003],
  [-0.0370080530, +0.0783835814, +0.9586244717],
];
const M2: number[][] = [
  [+0.2104542553, +0.7936177850, -0.0040720468],
  [+1.9779984951, -2.4285922050, +0.4505937099],
  [+0.0259040371, +0.7827717662, -0.8086757660],
];
const M1_INV: number[][] = [
  [+1.19080240, -0.36810842, +0.17730602],
  [+0.28969137, +0.83567411, -0.12536548],
  [+0.03700805, -0.07838358, +1.04137553],
];
const M2_INV: number[][] = [
  [+1.0000000, +0.3963377774, +0.2158037573],
  [+1.0000000, -0.1055613458, -0.0638541728],
  [+1.0000000, -0.0894841775, -1.2914855480],
];

/**
 * Converts an RGB color (sRGB, 0-255) to its OkLab representation.
 * @param rgb - RGB color [r, g, b].
 * @returns OkLab representation [L, a, b].
 * @see https://bottosson.github.io/posts/oklab/
 */
export function rgbToOkLab(
  rgb: [number, number, number],
): [number, number, number] {
  const r_linear = srgbToLinear(rgb[0]);
  const g_linear = srgbToLinear(rgb[1]);
  const b_linear = srgbToLinear(rgb[2]);

  // Convert linear RGB to LMS space (cone responses)
  const l = M1[0][0] * r_linear + M1[0][1] * g_linear + M1[0][2] * b_linear;
  const m = M1[1][0] * r_linear + M1[1][1] * g_linear + M1[1][2] * b_linear;
  const s = M1[2][0] * r_linear + M1[2][1] * g_linear + M1[2][2] * b_linear;

  // Apply non-linear transformation (cube root)
  // Add a small epsilon to avoid cbrt(0) issues if needed, though input should be clamped >= 0
  const l_ = Math.cbrt(Math.max(0, l));
  const m_ = Math.cbrt(Math.max(0, m));
  const s_ = Math.cbrt(Math.max(0, s));

  // Convert intermediate LMS to OkLab
  const L = M2[0][0] * l_ + M2[0][1] * m_ + M2[0][2] * s_;
  const a = M2[1][0] * l_ + M2[1][1] * m_ + M2[1][2] * s_;
  const b = M2[2][0] * l_ + M2[2][1] * m_ + M2[2][2] * s_;

  return [L, a, b];
}

/**
 * Converts an OkLab color to its RGB representation (sRGB, 0-255).
 * @param oklab - OkLab color [L, a, b].
 * @returns RGB representation [r, g, b].
 * @see https://bottosson.github.io/posts/oklab/
 */
export function okLabToRGB(
  oklab: [number, number, number],
): [number, number, number] {
  const [L, a, b_ok] = oklab;

  // Convert OkLab back to intermediate LMS (inverted M2)
  const l_ = M2_INV[0][0] * L + M2_INV[0][1] * a + M2_INV[0][2] * b_ok;
  const m_ = M2_INV[1][0] * L + M2_INV[1][1] * a + M2_INV[1][2] * b_ok;
  const s_ = M2_INV[2][0] * L + M2_INV[2][1] * a + M2_INV[2][2] * b_ok;

  // Reverse non-linear transformation (cube)
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Convert LMS back to linear sRGB (inverted M1)
  const r_linear = M1_INV[0][0] * l + M1_INV[0][1] * m + M1_INV[0][2] * s;
  const g_linear = M1_INV[1][0] * l + M1_INV[1][1] * m + M1_INV[1][2] * s;
  const b_linear = M1_INV[2][0] * l + M1_INV[2][1] * m + M1_INV[2][2] * s;

  // Convert linear RGB back to sRGB (0-255)
  const r = linearToSrgb(r_linear);
  const g = linearToSrgb(g_linear);
  const b = linearToSrgb(b_linear);

  return [r, g, b];
}

// --- IColor Conversion ---

/**
 * Converts various color input formats into the standardized IColor interface.
 * This function is central for internal color representation.
 *
 * @param input - The color input (string, RGB object, HSL object, Lab object, OkLab object, array, IColor, chroma.Color).
 * @returns An IColor object representing the color.
 * @throws Error if the input format cannot be parsed.
 *
 * @example
 * const iColorFromHex = toIColor("#ff00ff");
 * const iColorFromRgb = toIColor({ r: 255, g: 0, b: 255 });
 * const iColorFromChroma = toIColor(chroma('magenta'));
 */
export function toIColor(input: ColorInput): IColor {
  let c: Color;

  // Handle direct IColor input
  if (
    typeof input === "object" && input !== null && "hex" in input &&
    "rgb" in input && "oklab" in input
  ) {
    return input as IColor;
  }

  // Handle chroma.Color instance input
  if (input instanceof Color) {
    c = input;
  } // Handle string input (hex, named colors, rgb(), etc.)
  else if (typeof input === "string") {
    try {
      c = chroma(input);
    } catch (e) {
      console.error("Failed to parse string input to chroma:", input, e);
      c = chroma("black"); // Fallback
    }
  } // Handle RGB object input
  else if (
    typeof input === "object" && input !== null && "r" in input &&
    "g" in input && "b" in input
  ) {
    const rgbObj = input as RGB;
    c = chroma(rgbObj.r, rgbObj.g, rgbObj.b);
  } // Handle HSL object input
  else if (
    typeof input === "object" && input !== null && "h" in input &&
    "s" in input && "l" in input
  ) {
    const hslObj = input as HSL;
    c = chroma.hsl(hslObj.h, hslObj.s / 100, hslObj.l / 100);
  } // Handle Lab object input
  else if (
    typeof input === "object" && input !== null && "L" in input &&
    "a" in input && "b" in input && Object.keys(input).length === 3
  ) {
    // Distinguish between Lab and OkLab based on typical ranges or add specific type hints if possible
    // Assuming this is CIELab for now
    const labObj = input as Lab;
    c = chroma.lab(labObj.L, labObj.a, labObj.b);
  } // Handle OkLab object input (might need a more robust check if Lab/OkLab objects are ambiguous)
  // This assumes OkLab might be passed but chroma-js doesn't directly support it as input object. Convert via RGB.
  else if (
    typeof input === "object" && input !== null && "L" in input &&
    "a" in input && "b" in input && Object.keys(input).length === 3
  ) {
    // Heuristic: Assume it's OkLab if L is likely <= 1 (typical range), otherwise Lab
    // A better approach might require explicit type flags or separate functions
    const potentialOkLab = input as OkLab;
    if (potentialOkLab.L <= 1.1) { // OkLab L is typically ~0-1
      const rgb = okLabToRGB([
        potentialOkLab.L,
        potentialOkLab.a,
        potentialOkLab.b,
      ]);
      c = chroma(rgb);
    } else { // Assume CIELab
      c = chroma.lab(potentialOkLab.L, potentialOkLab.a, potentialOkLab.b);
    }
  } // Handle array input (assuming RGB if length 3, RGBA if length 4)
  else if (Array.isArray(input)) {
    if (input.length === 3) {
      c = chroma(input[0], input[1], input[2]);
    } else if (input.length === 4) {
      c = chroma(input[0], input[1], input[2]).alpha(input[3]);
    } else {
      console.error("Invalid array input length for toIColor:", input);
      c = chroma("black"); // Fallback
    }
  } // Fallback for unrecognized types
  else {
    console.error("Invalid input type for toIColor:", typeof input, input);
    c = chroma("black"); // Fallback
    // throw new Error(`Invalid input type for toIColor: ${typeof input}`);
  }

  // Extract values from the chroma object
  const rgb = c.rgb() as [number, number, number];
  const hex = c.hex();
  const hsl = c.hsl() as [number, number, number]; // Chroma returns h=[0,360] or NaN, s/l=[0,1]
  const lab = c.lab() as [number, number, number];
  const alpha = c.alpha();

  // Adjust HSL from [0,1] range to [0,100] for saturation and lightness
  const adjustedHsl: [number, number, number] = [
    isNaN(hsl[0]) ? 0 : hsl[0], // Handle NaN hue (e.g., for black/white)
    hsl[1] * 100,
    hsl[2] * 100,
  ];

  // Calculate OkLab from RGB
  const oklab = rgbToOkLab(rgb);

  return {
    hex,
    rgb,
    hsl: adjustedHsl,
    lab,
    oklab,
    alpha,
  };
}

/**
 * Converts an IColor object back to a chroma-js Color instance.
 * Useful for leveraging chroma-js's extensive manipulation functions.
 *
 * @param color - The IColor object.
 * @returns A chroma-js Color instance.
 *
 * @example
 * const iColor = toIColor("#ff00ff");
 * const chromaColor = fromIColor(iColor);
 * const darkerMagenta = chromaColor.darken().hex(); // "#cc00cc"
 */
export function fromIColor(color: IColor): Color {
  // Create from RGB and set alpha
  return chroma(color.rgb).alpha(color.alpha ?? 1);
}

// --- Specific Format Conversions (using IColor as intermediate) ---

/**
 * Converts a HEX string to an RGB tuple [r, g, b].
 * @param hex - The hex color string (e.g., "#FF00AA").
 * @returns RGB tuple [r, g, b].
 * @example
 * const rgb = hexToRGBTuple("#FF00AA"); // [255, 0, 170]
 */
export function hexToRGBTuple(hex: string): [number, number, number] {
  return toIColor(hex).rgb;
}

/**
 * Converts an RGB tuple [r, g, b] to a HEX string.
 * @param rgb - The RGB tuple [r, g, b].
 * @returns The hex string representation (e.g., "#FF00AA").
 * @example
 * const hex = rgbTupleToHex([255, 0, 170]); // "#ff00aa"
 */
export function rgbTupleToHex(rgb: [number, number, number]): string {
  return toIColor(rgb).hex;
}

/**
 * Converts a HEX string to an HSL tuple [h, s, l].
 * @param hex - The hex color string.
 * @returns HSL tuple [h, s, l].
 * @example
 * const hsl = hexToHSLTuple("#ff8800"); // [ 32, 100, 50 ] (approx)
 */
export function hexToHSLTuple(hex: string): [number, number, number] {
  return toIColor(hex).hsl;
}

/**
 * Converts an HSL tuple [h, s, l] to a HEX string.
 * @param hsl - The HSL tuple [h, s, l].
 * @returns The hex string representation.
 * @example
 * const hex = hslTupleToHex([32, 100, 50]); // "#ff8800" (approx)
 */
export function hslTupleToHex(hsl: [number, number, number]): string {
  return toIColor({ h: hsl[0], s: hsl[1], l: hsl[2] }).hex;
}

/**
 * Converts an RGB tuple [r, g, b] to an HSL tuple [h, s, l].
 * @param rgb - The RGB tuple [r, g, b].
 * @returns HSL tuple [h, s, l].
 */
export function rgbTupleToHSLTuple(
  rgb: [number, number, number],
): [number, number, number] {
  return toIColor(rgb).hsl;
}

/**
 * Converts an HSL tuple [h, s, l] to an RGB tuple [r, g, b].
 * @param hsl - The HSL tuple [h, s, l].
 * @returns RGB tuple [r, g, b].
 */
export function hslTupleToRGBTuple(
  hsl: [number, number, number],
): [number, number, number] {
  return toIColor({ h: hsl[0], s: hsl[1], l: hsl[2] }).rgb;
}

/**
 * Converts an RGB tuple [r, g, b] to a CIELab tuple [L, a, b].
 * @param rgb - The RGB tuple [r, g, b].
 * @returns CIELab tuple [L, a, b].
 */
export function rgbTupleToLabTuple(
  rgb: [number, number, number],
): [number, number, number] {
  return toIColor(rgb).lab;
}

/**
 * Converts a CIELab tuple [L, a, b] to an RGB tuple [r, g, b].
 * @param lab - The CIELab tuple [L, a, b].
 * @returns RGB tuple [r, g, b].
 */
export function labTupleToRGBTuple(
  lab: [number, number, number],
): [number, number, number] {
  return toIColor({ L: lab[0], a: lab[1], b: lab[2] }).rgb;
}

/**
 * Converts an OkLab tuple [L, a, b] to an RGB tuple [r, g, b].
 * @param oklab - The OkLab tuple [L, a, b].
 * @returns RGB tuple [r, g, b].
 */
export function okLabTupleToRGBTuple(
  oklab: [number, number, number],
): [number, number, number] {
  // Use the direct OkLab -> RGB conversion
  return okLabToRGB(oklab);
}

/**
 * Converts an RGB tuple [r, g, b] to an OkLab tuple [L, a, b].
 * @param rgb - The RGB tuple [r, g, b].
 * @returns OkLab tuple [L, a, b].
 */
export function rgbTupleToOkLabTuple(
  rgb: [number, number, number],
): [number, number, number] {
  // Use the direct RGB -> OkLab conversion
  return rgbToOkLab(rgb);
}
