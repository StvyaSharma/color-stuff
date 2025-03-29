import { fromIColor, type IColor } from "../core/color-operations.ts";

/**
 * Calculates luminance for an IColor object.
 * Uses the core library's method via chroma-js instance.
 *
 * @param color - The color object.
 * @returns Luminance (0 to 1).
 */
export const calculateLuminance = (color: IColor): number => {
  return fromIColor(color).luminance();
};

/**
 * Calculates contrast ratio between two IColor objects.
 * Uses the core library's method via chroma-js instance.
 *
 * @param color1 - First IColor object.
 * @param color2 - Second IColor object.
 * @returns Contrast ratio.
 */
export const calculateContrast = (color1: IColor, color2: IColor): number => {
  const lum1 = calculateLuminance(color1);
  const lum2 = calculateLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

/**
 * Evaluates a generated palette solution based on a primary color.
 * The palette is expected to be an array of 5 IColor objects in the order:
 * [accent, background, surface, button_text, main_text]
 *
 * @param primaryColor - The primary IColor object.
 * @param palette - An array of 5 IColor objects representing the palette.
 * @returns Fitness value (Higher is better). Returns -Infinity for invalid palettes.
 */
export const evaluatePaletteSolution = (
  primaryColor: IColor,
  palette: IColor[],
): number => {
  // Ensure the palette has the correct number of colors
  if (palette.length !== 5) {
    console.warn(
      `evaluatePaletteSolution expects a palette of 5 colors, received ${palette.length}.`,
    );
    return -Infinity; // Indicate an invalid solution
  }

  let eval_metric = 0;
  const [accentColor, background, surfaceColor, buttonText, mainText] = palette;

  // Extract RGB for legacy contrast/luminance if needed, or use IColor directly
  const primaryRGB = primaryColor.rgb; // Example if needed
  const accentRGB = accentColor.rgb;
  const backgroundRGB = background.rgb;
  const surfaceRGB = surfaceColor.rgb;
  const buttonTextRGB = buttonText.rgb;
  const mainTextRGB = mainText.rgb;

  // --- Re-implementing evaluation logic using IColor and calculateContrast ---

  // Ensure background is not very dark or very bright and not monotone
  const backgroundLuminance = calculateLuminance(background);
  const backgroundIsMonotone = backgroundRGB.every(
    (val) => val === backgroundRGB[0],
  );
  if (
    backgroundLuminance > 0.2 &&
    backgroundLuminance < 0.8 &&
    !backgroundIsMonotone
  ) {
    eval_metric += 3;
  } else {
    eval_metric -= 3;
  }

  // Maximum contrast between text and their backgrounds
  eval_metric += calculateContrast(primaryColor, buttonText);
  eval_metric += calculateContrast(accentColor, buttonText);
  eval_metric += calculateContrast(surfaceColor, mainText);

  // At least AA between primary color and surface bg
  const primarySurfaceContrast = calculateContrast(primaryColor, surfaceColor);
  if (primarySurfaceContrast > 4.5) eval_metric += 3;
  else if (primarySurfaceContrast > 3) eval_metric += 2;
  else if (primarySurfaceContrast > 2) eval_metric += 1;

  const accentSurfaceContrast = calculateContrast(accentColor, surfaceColor);
  if (accentSurfaceContrast > 4.5) eval_metric += 3;
  else if (accentSurfaceContrast > 3) eval_metric += 2;
  else if (accentSurfaceContrast > 2) eval_metric += 1;

  // At least AA Large for background and surface bg
  const backgroundSurfaceContrast = calculateContrast(background, surfaceColor);
  if (backgroundSurfaceContrast > 3) {
    eval_metric += Math.min(backgroundSurfaceContrast, 7);
  } else if (backgroundSurfaceContrast > 2) {
    eval_metric += 2;
  } else if (backgroundSurfaceContrast > 1.5) {
    eval_metric += 1;
  }

  // Primary color and accent color contrast (complementary range)
  const primaryAccentContrast = calculateContrast(primaryColor, accentColor);
  if (primaryAccentContrast >= 4.5 && primaryAccentContrast <= 7) {
    eval_metric += 3;
  } else if (primaryAccentContrast > 3) {
    eval_metric += 2;
  } else if (primaryAccentContrast >= 2) {
    eval_metric += 1;
  } else if (primaryAccentContrast > 7) {
    eval_metric += 1; // Minimal reward if too high contrast
  }

  // Background color complementary to primary and accent
  const backgroundPrimaryContrast = calculateContrast(background, primaryColor);
  if (backgroundPrimaryContrast >= 4.5 && backgroundPrimaryContrast <= 7) {
    eval_metric += 3;
  } else if (backgroundPrimaryContrast > 3) {
    eval_metric += 2;
  } else if (backgroundPrimaryContrast >= 2) {
    eval_metric += 1;
  } else if (backgroundPrimaryContrast > 7) {
    eval_metric += 1;
  }

  const backgroundAccentContrast = calculateContrast(background, accentColor);
  if (backgroundAccentContrast >= 4.5 && backgroundAccentContrast <= 7) {
    eval_metric += 3;
  } else if (backgroundAccentContrast > 3) {
    eval_metric += 2;
  } else if (backgroundAccentContrast >= 2) {
    eval_metric += 1;
  } else if (backgroundAccentContrast > 7) {
    eval_metric += 1;
  }

  return eval_metric;
};

/**
 * Generates a random integer between min (inclusive) and max (inclusive).
 * @param min - Minimum value.
 * @param max - Maximum value.
 * @returns A random integer.
 */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min);

/**
 * Clamps a number between min and max.
 * @param value - The number to clamp.
 * @param min - Minimum allowed value.
 * @param max - Maximum allowed value.
 * @returns Clamped number.
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(value, max));
};

/**
 * Delays the execution of the next operation.
 *
 * @param durationInMs - The duration to wait before resolving the promise, in milliseconds.
 * @returns A promise that resolves after the specified duration.
 */
export const sleep = (durationInMs: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, durationInMs));
};
