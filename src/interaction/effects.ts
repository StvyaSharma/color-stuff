/**
 * @file interaction/effects.ts
 * Functions simulating environmental effects on color appearance, like lighting and materials.
 * Note: These are highly simplified approximations.
 */
import chroma from "chroma-js";
import type { IColor } from "../core/color.types";
import { fromIColor, toIColor } from "../core/conversions";
import { clamp } from "../utils/math";

/**
 * Simulates the effect of light temperature (warm/cool) on a color.
 * Warmer light adds yellow/red, cooler light adds blue.
 * This is a very basic approximation using RGB channel shifts.
 *
 * @param color - The IColor object under neutral light.
 * @param temperatureKelvin - The approximate color temperature of the light (e.g., 2700K warm, 6500K cool/daylight).
 * @param intensity - Factor controlling the strength of the temperature effect (0 to 1). Defaults to 0.1.
 * @returns A new IColor simulating the appearance under the specified light temperature.
 *
 * @example
 * const white = toIColor('white');
 * const warmWhite = adjustForLightTemperature(white, 3000, 0.2); // Slightly yellowish
 * const coolWhite = adjustForLightTemperature(white, 7000, 0.2); // Slightly bluish
 * console.log(`Warm: ${warmWhite.hex}, Cool: ${coolWhite.hex}`);
 */
export function adjustForLightTemperature(
  color: IColor,
  temperatureKelvin: number,
  intensity: number = 0.1, // Control effect strength
): IColor {
  const baseChroma = fromIColor(color);
  let adjustedChroma: chroma.Color;

  // Reference neutral temperature (e.g., D65)
  const neutralTemp = 6500;
  const tempDiff = temperatureKelvin - neutralTemp;

  // Very simplified: shift towards yellow/orange for warm, blue for cool
  if (tempDiff < 0) { // Warmer than neutral
    // Mix with a warm color (e.g., orange)
    const warmInfluence = chroma("orange");
    // Intensity scales the mix ratio - more intensity means more mix
    adjustedChroma = chroma.mix(
      baseChroma,
      warmInfluence,
      Math.abs(tempDiff / neutralTemp) * intensity,
      "lab",
    );
  } else if (tempDiff > 0) { // Cooler than neutral
    // Mix with a cool color (e.g., light blue)
    const coolInfluence = chroma("lightblue");
    adjustedChroma = chroma.mix(
      baseChroma,
      coolInfluence,
      Math.abs(tempDiff / neutralTemp) * intensity,
      "lab",
    );
  } else {
    // No change if exactly neutral
    adjustedChroma = baseChroma;
  }

  // Preserve original alpha
  return toIColor(adjustedChroma.alpha(color.alpha));
}

/** Supported material profile types for simulation. */
export type MaterialProfile = "matte" | "glossy" | "metallic" | "none";

/**
 * Simulates the effect of a material's surface properties on a color.
 * Note: This is a highly stylized and simplified approximation. Realistic rendering is complex.
 * - Matte: Slightly desaturates and darkens.
 * - Glossy: Slightly increases saturation and adds a subtle lightness boost (simulating highlight).
 * - Metallic: Shifts hue slightly towards gray, increases contrast slightly.
 *
 * @param color - The base IColor object.
 * @param material - The type of material ('matte', 'glossy', 'metallic', 'none').
 * @param intensity - Factor controlling the strength of the material effect (0 to 1). Defaults to 0.15.
 * @returns A new IColor simulating the appearance on the specified material.
 *
 * @example
 * const red = toIColor('red');
 * const matteRed = applyMaterialProfile(red, 'matte');
 * const glossyRed = applyMaterialProfile(red, 'glossy');
 * const metallicRed = applyMaterialProfile(red, 'metallic');
 * console.log(`Matte: ${matteRed.hex}, Glossy: ${glossyRed.hex}, Metallic: ${metallicRed.hex}`);
 */
export function applyMaterialProfile(
  color: IColor,
  material: MaterialProfile,
  intensity: number = 0.15, // Control effect strength
): IColor {
  const baseChroma = fromIColor(color);
  let adjustedChroma = baseChroma;

  switch (material) {
    case "matte":
      // Slightly decrease saturation and lightness
      adjustedChroma = baseChroma
        .desaturate(intensity * 2) // Desaturate more noticeably
        .darken(intensity * 0.5); // Darken slightly
      break;
    case "glossy":
      // Slightly increase saturation and lightness
      adjustedChroma = baseChroma
        .saturate(intensity)
        .brighten(intensity * 0.8); // Brighten slightly to simulate highlight
      break;
    case "metallic": {
      // More complex: slightly desaturate, increase contrast (darken darks, lighten lights)
      // Shift towards gray based on lightness. Mix with gray.
      const grayEquivalent = baseChroma.luminance() > 0.5
        ? chroma("lightgray")
        : chroma("darkgray");
      adjustedChroma = chroma.mix(
        baseChroma,
        grayEquivalent,
        intensity * 1.5,
        "lab",
      );
      // Increase contrast slightly - maybe by adjusting lightness curve? Simpler: small brighten/darken.
      adjustedChroma = baseChroma.luminance() > 0.5
        ? adjustedChroma.brighten(intensity * 0.5)
        : adjustedChroma.darken(intensity * 0.5);
      break;
    }
    case "none":
      // No change
      break;
  }

  return toIColor(adjustedChroma.alpha(color.alpha));
}

/**
 * Simulates 'Film Color' effect by layering semi-transparent versions of the color.
 * Creates a palette where each color is the result of overlaying the base color onto the previous one.
 *
 * @param baseColor - The starting IColor.
 * @param numLayers - The number of layers (steps) in the resulting palette (including the base). Defaults to 5.
 * @param opacity - The opacity of each overlaid layer (0 to 1). Lower opacity means subtler changes per layer. Defaults to 0.2.
 * @param background - The background color onto which layers are composited. Defaults to white.
 * @returns A palette (array of IColor) simulating the layered effect.
 *
 * @example
 * const blue = toIColor('blue');
 * const filmPalette = createFilmColorPalette(blue, 5, 0.3, 'black'); // Layer blue onto black
 * console.log(filmPalette.map(c => c.hex));
 */
export function createFilmColorPalette(
  baseColor: IColor,
  numLayers: number = 5,
  opacity: number = 0.2,
  background: IColor | string = "white",
): Palette {
  const palette: IColor[] = [];
  const baseWithOpacity = fromIColor(baseColor).alpha(clamp(opacity, 0, 1));
  let previousColor = toIColor(background); // Start with the background

  // Add the initial background? Or start with the first layer? Let's start with the first layer.
  // Layer 1: base color composited onto background
  let currentColorChroma = chroma.mix(
    baseWithOpacity,
    fromIColor(previousColor),
    baseWithOpacity.alpha(),
    "rgb",
  ); // Mix based on alpha
  palette.push(toIColor(currentColorChroma));

  for (let i = 1; i < numLayers; i++) {
    // Composite the base color (with opacity) onto the *previous* generated color
    previousColor = palette[palette.length - 1];
    currentColorChroma = chroma.mix(
      baseWithOpacity,
      fromIColor(previousColor),
      baseWithOpacity.alpha(),
      "rgb",
    );
    palette.push(toIColor(currentColorChroma));
  }

  return palette;
}
