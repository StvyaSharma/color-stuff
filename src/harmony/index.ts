/**
 * @file harmony/index.ts
 * Re-exports color harmony calculation functions.
 */

export * from './rules';
```

---

**`palettes/src/interaction/perceptual.ts`**

```typescript
/**
 * @file interaction/perceptual.ts
 * Functions simulating perceptual color interactions like relativity and subtraction.
 */
import chroma from "chroma-js";
import type { IColor } from "../core/color.types";
import { fromIColor, toIColor } from "../core/conversions";

/**
 * Simulates the perceived color of a `baseColor` when surrounded by `surroundingColors`.
 * This approximates the principle of simultaneous contrast or color relativity.
 * The perceived color tends to shift away from the surrounding colors in Lab space.
 *
 * @param baseColor - The IColor object whose perception is being simulated.
 * @param surroundingColors - An array of IColor objects surrounding the base color.
 * @param influenceFactor - How much the surroundings affect the base (0 to 1). Defaults to 0.1.
 * @returns A new IColor representing the estimated perceived color.
 *
 * @example
 * const gray = toIColor('gray');
 * const yellow = toIColor('yellow');
 * // Gray surrounded by yellow might appear slightly bluish/purplish
 * const perceivedGray = perceivedColor(gray, [yellow], 0.15);
 * console.log(`Original: ${gray.hex}, Perceived near yellow: ${perceivedGray.hex}`);
 */
export function perceivedColor(
  baseColor: IColor,
  surroundingColors: IColor[],
  influenceFactor: number = 0.1 // Start with a subtle effect
): IColor {
  if (surroundingColors.length === 0) {
    return baseColor; // No change if no surroundings
  }

  const baseLab = baseColor.lab; // [L, a, b]

  // Calculate the average Lab color of the surroundings
  let avgL = 0, avgA = 0, avgB = 0;
  surroundingColors.forEach(sc => {
    const lab = sc.lab;
    avgL += lab[0];
    avgA += lab[1];
    avgB += lab[2];
  });
  avgL /= surroundingColors.length;
  avgA /= surroundingColors.length;
  avgB /= surroundingColors.length;

  // Calculate the difference vector from average surrounding to base color
  const deltaL = baseLab[0] - avgL;
  const deltaA = baseLab[1] - avgA;
  const deltaB = baseLab[2] - avgB;

  // Shift the base color slightly *away* from the average surrounding color
  // We push it further along the difference vector.
  const perceivedL = baseLab[0] + deltaL * influenceFactor;
  const perceivedA = baseLab[1] + deltaA * influenceFactor;
  const perceivedB = baseLab[2] + deltaB * influenceFactor;

  // Create the new color in Lab space and convert back to IColor
  // Chroma handles clamping Lab values if they go out of typical range during conversion
   try {
       const perceivedChroma = chroma.lab(perceivedL, perceivedA, perceivedB).alpha(baseColor.alpha);
       return toIColor(perceivedChroma);
   } catch (e) {
        console.error("Error creating color from perceived Lab values:", e);
        return baseColor; // Fallback
   }
}

/**
 * Simulates the "subtraction of color" principle, shifting a `baseColor`
 * away from a `groundColor` in the chromatic dimensions (a* and b* of Lab space).
 * This can help create harmony by reducing the ground color's "tint" in the base color.
 *
 * @param baseColor - The IColor object to modify.
 * @param groundColor - The IColor object representing the background or dominant color.
 * @param subtractionFactor - The degree of subtraction (0 to 1). Defaults to 0.1.
 * @returns A new IColor shifted away from the ground color.
 *
 * @example
 * const slightlyGreenishWhite = toIColor('#f0fff0'); // Honeydew
 * const greenGround = toIColor('green');
 * // Subtract green influence from the white to make it appear purer white
 * const purerWhite = subtractColor(slightlyGreenishWhite, greenGround, 0.2);
 * console.log(`Original: ${slightlyGreenishWhite.hex}, Subtracted: ${purerWhite.hex}`);
 */
export function subtractColor(
  baseColor: IColor,
  groundColor: IColor,
  subtractionFactor: number = 0.1
): IColor {
  const baseLab = baseColor.lab;     // [L, a, b]
  const groundLab = groundColor.lab; // [L, a, b]

  // Calculate the chromatic difference vector (ground -> base)
  const deltaA = baseLab[1] - groundLab[1];
  const deltaB = baseLab[2] - groundLab[2];

  // Shift the base color's chromatic components *away* from the ground color.
  // This means adding the difference vector scaled by the factor.
  // Note: The original code subtracted `delta * factor`, which pushes *towards* the ground.
  // To push *away*, we should add the difference vector. Let's stick to the original code's
  // *intent* as described ("shifting colors *away* from a dominant ground color"),
  // which implies we need to counteract the ground's influence.
  // Shifting away means moving further along the vector from ground to base.
  // Let's reconsider the original implementation: `base - (ground - base) * factor`. This simplifies to `base * (1+factor) - ground * factor`.
  // A simpler interpretation of "subtracting influence" might be moving the base color *opposite* to the ground color's chromaticity relative to neutral gray (a=0, b=0).
  // Let's try shifting base's a/b away from ground's a/b.
  const shiftA = (baseLab[1] - groundLab[1]) * subtractionFactor;
  const shiftB = (baseLab[2] - groundLab[2]) * subtractionFactor;

  // New a/b are base a/b plus the shift away from ground
  const subtractedA = baseLab[1] + shiftA;
  const subtractedB = baseLab[2] + shiftB;

  // Keep original Lightness
  const subtractedL = baseLab[0];

   try {
       const subtractedChroma = chroma.lab(subtractedL, subtractedA, subtractedB).alpha(baseColor.alpha);
       return toIColor(subtractedChroma);
   } catch (e) {
        console.error("Error creating color from subtracted Lab values:", e);
        return baseColor; // Fallback
   }
}


/**
 * Adjusts the perceived boundaries of a color, simulating softness or hardness.
 * This is often achieved by slightly adjusting lightness or saturation at the edges,
 * approximated here by a simple lightness adjustment.
 *
 * @param baseColor - The IColor object.
 * @param factor - The degree of adjustment (0 to 1). Defaults to 0.1.
 * @param direction - 'softer' (usually darker/less saturated) or 'harder' (usually lighter/more saturated). Defaults to 'softer'.
 * @returns A new IColor with adjusted boundary appearance.
 *
 * @example
 * const red = toIColor('red');
 * const softerRed = adjustBoundaries(red, 0.2, 'softer'); // Slightly darker red
 * const harderRed = adjustBoundaries(red, 0.2, 'harder'); // Slightly lighter red
 */
export function adjustBoundaries(
  baseColor: IColor,
  factor: number = 0.1, // Renamed from softnessFactor for clarity
  direction: "softer" | "harder" = "softer"
): IColor {
  const baseLab = baseColor.lab;
  let adjustedL = baseLab[0];
  const change = factor * 10; // Scale factor for noticeable change

  if (direction === "softer") {
    // Softer edges often appear slightly darker or less saturated
    adjustedL = baseLab[0] - change;
  } else {
    // Harder edges often appear slightly lighter or more saturated
    adjustedL = baseLab[0] + change;
  }

  // Clamp lightness
  adjustedL = Math.max(0, Math.min(100, adjustedL));

   try {
      const adjustedChroma = chroma.lab(adjustedL, baseLab[1], baseLab[2]).alpha(baseColor.alpha);
      return toIColor(adjustedChroma);
   } catch (e) {
        console.error("Error creating color from adjusted boundary Lab values:", e);
        return baseColor; // Fallback
   }
}

/**
 * Modifies the perceived emphasis or visual weight of a color.
 * This can be simulated by adjusting saturation/chroma. More saturated colors
 * often appear more emphasized.
 *
 * @param baseColor - The IColor object.
 * @param factor - The degree of emphasis change (0 to 1). Defaults to 0.2.
 * @param direction - 'more' (increase emphasis/saturation) or 'less' (decrease emphasis/saturation). Defaults to 'more'.
 * @returns A new IColor with adjusted emphasis.
 *
 * @example
 * const blue = toIColor('blue');
 * const emphasizedBlue = modifyEmphasis(blue, 0.3, 'more'); // More saturated blue
 * const deemphasizedBlue = modifyEmphasis(blue, 0.3, 'less'); // Less saturated blue
 */
export function modifyEmphasis(
  baseColor: IColor,
  factor: number = 0.2, // Renamed from emphasisFactor
  direction: "more" | "less" = "more"
): IColor {
  const baseLCH = fromIColor(baseColor).lch(); // Use LCH: [L, C, H]
  let adjustedC = baseLCH[1]; // Chroma

  if (direction === 'more') {
    // Increase chroma
    adjustedC = baseLCH[1] * (1 + factor);
  } else {
    // Decrease chroma
    adjustedC = baseLCH[1] * (1 - factor);
  }

  // Chroma must be non-negative
  adjustedC = Math.max(0, adjustedC);

  try {
      // Handle potential NaN hue for grays
      const hue = isNaN(baseLCH[2]) ? 0 : baseLCH[2];
      const adjustedChroma = chroma.lch(baseLCH[0], adjustedC, hue).alpha(baseColor.alpha);
      return toIColor(adjustedChroma);
  } catch (e) {
        console.error("Error creating color from modified emphasis LCH values:", e);
        return baseColor; // Fallback
  }
}


/**
 * Finds the perceptual middle color between two colors using Lab interpolation.
 *
 * @param color1 - The first IColor object.
 * @param color2 - The second IColor object.
 * @returns A new IColor representing the perceptual midpoint.
 *
 * @example
 * const colorA = toIColor('darkred');
 * const colorB = toIColor('lightblue');
 * const middle = middleColor(colorA, colorB); // A perceptually intermediate color
 * console.log(middle.hex);
 */
export function middleColor(color1: IColor, color2: IColor): IColor {
    // Use chroma's mix function in Lab space with ratio 0.5
    const midChroma = chroma.mix(fromIColor(color1), fromIColor(color2), 0.5, 'lab');

    // Average alpha
    const avgAlpha = ((color1.alpha ?? 1) + (color2.alpha ?? 1)) / 2;

    return toIColor(midChroma.alpha(avgAlpha));
}
