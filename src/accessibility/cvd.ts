/**
 * @file accessibility/cvd.ts
 * Implements Color Vision Deficiency (CVD) simulation using the Brettel/Viénot/Mollon model.
 * Provides more accurate simulation than simple matrix approximations.
 */

import type { IColor } from "../core/color.types.ts";
import { fromIColor, toIColor } from "../core/conversions.ts";
import { clamp } from "../utils/math.ts";

// --- Brettel model helper functions ---

// sRGB to Linear RGB conversion (optimized lookup)
const sRGB_to_linearRGB_Lookup = Array(256).fill(0).map((_, i) => {
  const v = i / 255.0;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
});

// Linear RGB to sRGB conversion
function linearRGB_from_sRGB(v: number): number {
  const fv = v / 255.0;
  if (fv < 0.04045) return fv / 12.92;
  return Math.pow((fv + 0.055) / 1.055, 2.4);
}

function sRGB_from_linearRGB(v: number): number {
  if (v <= 0) return 0;
  if (v >= 1) return 255;
  if (v < 0.0031308) return clamp(Math.round(0.5 + v * 12.92 * 255), 0, 255);
  return clamp(
    Math.round(0 + 255 * (Math.pow(v, 1.0 / 2.4) * 1.055 - 0.055)),
    0,
    255,
  );
}

// Brettel model parameters (based on research implementations)
const brettel_params: Record<
  string,
  {
    rgbCvdFromRgb_1: number[];
    rgbCvdFromRgb_2: number[];
    separationPlaneNormal: number[];
  }
> = {
  protan: {
    rgbCvdFromRgb_1: [
      0.1451,
      1.20165,
      -0.34675,
      0.10447,
      0.85316,
      0.04237,
      0.00429,
      -0.00603,
      1.00174,
    ],
    rgbCvdFromRgb_2: [
      0.14115,
      1.16782,
      -0.30897,
      0.10495,
      0.8573,
      0.03776,
      0.00431,
      -0.00586,
      1.00155,
    ],
    separationPlaneNormal: [0.00048, 0.00416, -0.00464],
  },
  deutan: {
    rgbCvdFromRgb_1: [
      0.36198,
      0.86755,
      -0.22953,
      0.26099,
      0.64512,
      0.09389,
      -0.01975,
      0.02686,
      0.99289,
    ],
    rgbCvdFromRgb_2: [
      0.37009,
      0.8854,
      -0.25549,
      0.25767,
      0.63782,
      0.10451,
      -0.0195,
      0.02741,
      0.99209,
    ],
    separationPlaneNormal: [-0.00293, -0.00645, 0.00938],
  },
  tritan: {
    rgbCvdFromRgb_1: [
      1.01354,
      0.14268,
      -0.15622,
      -0.01181,
      0.87561,
      0.13619,
      0.07707,
      0.81208,
      0.11085,
    ],
    rgbCvdFromRgb_2: [
      0.93337,
      0.19999,
      -0.13336,
      0.05809,
      0.82565,
      0.11626,
      -0.37923,
      1.13825,
      0.24098,
    ],
    separationPlaneNormal: [0.0396, -0.02831, -0.01129],
  },
};

/**
 * Internal Brettel simulation function.
 * @param srgb - Original sRGB color [0-255].
 * @param type - 'protan', 'deutan', or 'tritan'.
 * @param severity - Severity of deficiency (0.0 to 1.0).
 * @returns Simulated sRGB color [0-255].
 * @private
 */
function brettel(
  srgb: [number, number, number],
  type: "protan" | "deutan" | "tritan",
  severity: number,
): [number, number, number] {
  // Convert sRGB to linear RGB using lookup
  const rgb = [
    sRGB_to_linearRGB_Lookup[srgb[0]],
    sRGB_to_linearRGB_Lookup[srgb[1]],
    sRGB_to_linearRGB_Lookup[srgb[2]],
  ] as [number, number, number];

  const params = brettel_params[type];
  const separationPlaneNormal = params.separationPlaneNormal;
  const rgbCvdFromRgb_1 = params.rgbCvdFromRgb_1;
  const rgbCvdFromRgb_2 = params.rgbCvdFromRgb_2;

  // Check dot product with separation plane normal
  const dotWithSepPlane = rgb[0] * separationPlaneNormal[0] +
    rgb[1] * separationPlaneNormal[1] + rgb[2] * separationPlaneNormal[2];
  const rgbCvdFromRgb = dotWithSepPlane >= 0
    ? rgbCvdFromRgb_1
    : rgbCvdFromRgb_2;

  // Apply the transformation matrix
  const rgb_cvd = [
    rgbCvdFromRgb[0] * rgb[0] + rgbCvdFromRgb[1] * rgb[1] +
    rgbCvdFromRgb[2] * rgb[2],
    rgbCvdFromRgb[3] * rgb[0] + rgbCvdFromRgb[4] * rgb[1] +
    rgbCvdFromRgb[5] * rgb[2],
    rgbCvdFromRgb[6] * rgb[0] + rgbCvdFromRgb[7] * rgb[1] +
    rgbCvdFromRgb[8] * rgb[2],
  ] as [number, number, number];

  // Apply severity factor via linear interpolation in linear RGB space
  rgb_cvd[0] = rgb_cvd[0] * severity + rgb[0] * (1.0 - severity);
  rgb_cvd[1] = rgb_cvd[1] * severity + rgb[1] * (1.0 - severity);
  rgb_cvd[2] = rgb_cvd[2] * severity + rgb[2] * (1.0 - severity);

  // Convert back to sRGB [0-255]
  return [
    sRGB_from_linearRGB(rgb_cvd[0]),
    sRGB_from_linearRGB(rgb_cvd[1]),
    sRGB_from_linearRGB(rgb_cvd[2]),
  ] as [number, number, number];
}

/**
 * Simulates monochrome vision (Achromatopsia/Achromatomaly).
 * @param srgb - Original sRGB color [0-255].
 * @param severity - Severity (0.0 to 1.0). 1.0 for Achromatopsia.
 * @returns Simulated sRGB color [0-255].
 * @private
 */
function monochrome_with_severity(
  srgb: [number, number, number],
  severity: number,
): [number, number, number] {
  // Standard luminance calculation for grayscale conversion
  const z = Math.round(srgb[0] * 0.299 + srgb[1] * 0.587 + srgb[2] * 0.114);
  // Interpolate between grayscale and original color based on severity
  const r = clamp(
    Math.round(z * severity + srgb[0] * (1.0 - severity)),
    0,
    255,
  );
  const g = clamp(
    Math.round(z * severity + srgb[1] * (1.0 - severity)),
    0,
    255,
  );
  const b = clamp(
    Math.round(z * severity + srgb[2] * (1.0 - severity)),
    0,
    255,
  );
  return [r, g, b];
}

/** Type definition for supported CVD simulations */
export type CvdType =
  | "protanopia" // Severity 1.0 Protan
  | "protanomaly" // Severity 0.6 Protan (example severity)
  | "deuteranopia" // Severity 1.0 Deutan
  | "deuteranomaly" // Severity 0.6 Deutan (example severity)
  | "tritanopia" // Severity 1.0 Tritan
  | "tritanomaly" // Severity 0.6 Tritan (example severity)
  | "achromatopsia" // Severity 1.0 Monochrome
  | "achromatomaly"; // Severity 0.6 Monochrome (example severity)

/**
 * Simulates the appearance of a color for various types of Color Vision Deficiency (CVD).
 * Uses the Brettel/Viénot/Mollon model for dichromacy/anomaly and luminance mapping for achromatopsia.
 *
 * @param color - The IColor object to simulate.
 * @param type - The type of CVD to simulate.
 * @param severity - Optional severity for anomalies (0.0 to 1.0). Defaults are used if not provided (e.g., 1.0 for -opia, 0.6 for -omaly).
 * @returns A new IColor object representing the simulated color appearance.
 *
 * @example
 * const red = toIColor("red");
 * const simulatedProtanopiaRed = simulateCVD(red, "protanopia");
 * console.log(simulatedProtanopiaRed.hex); // Example: might look yellowish/grayish
 *
 * const blue = toIColor("blue");
 * const simulatedTritanomalyBlue = simulateCVD(blue, "tritanomaly", 0.7); // Specify severity
 * console.log(simulatedTritanomalyBlue.hex); // Example: might look more greenish/grayish
 */
export function simulateCVD(
  color: IColor,
  type: CvdType,
  severity?: number,
): IColor {
  const originalRgb = color.rgb;
  let simulatedRgb: [number, number, number];

  switch (type) {
    case "protanopia":
      simulatedRgb = brettel(originalRgb, "protan", severity ?? 1.0);
      break;
    case "protanomaly":
      simulatedRgb = brettel(originalRgb, "protan", severity ?? 0.6);
      break;
    case "deuteranopia":
      simulatedRgb = brettel(originalRgb, "deutan", severity ?? 1.0);
      break;
    case "deuteranomaly":
      simulatedRgb = brettel(originalRgb, "deutan", severity ?? 0.6);
      break;
    case "tritanopia":
      simulatedRgb = brettel(originalRgb, "tritan", severity ?? 1.0);
      break;
    case "tritanomaly":
      simulatedRgb = brettel(originalRgb, "tritan", severity ?? 0.6);
      break;
    case "achromatopsia":
      simulatedRgb = monochrome_with_severity(originalRgb, severity ?? 1.0);
      break;
    case "achromatomaly":
      simulatedRgb = monochrome_with_severity(originalRgb, severity ?? 0.6);
      break;
    default:
      // Should not happen with typed input, but handle defensively
      console.warn(`Unsupported CVD type: ${type}. Returning original color.`);
      simulatedRgb = originalRgb;
  }

  // Convert the simulated RGB back to IColor, preserving original alpha
  const simulatedChroma = fromIColor(toIColor(simulatedRgb)).alpha(color.alpha);
  return toIColor(simulatedChroma);
}
