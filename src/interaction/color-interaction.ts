import chroma from "chroma-js";

/**
 * Adjusts the base color based on the influence of surrounding colors.
 * This function simulates the principle of color relativity, where a color's
 * perceived appearance is altered by its surrounding colors.
 */
export function perceivedColor(
  baseColorHex: string,
  surroundingColorsHex: string[],
): string {
  try {
    const baseColor = chroma(baseColorHex);
    const surroundingColors = surroundingColorsHex.map((hex) => chroma(hex));

    let avgL = 0;
    let avgA = 0;
    let avgB = 0;

    for (const color of surroundingColors) {
      const labColor = color.lab();
      avgL += labColor[0];
      avgA += labColor[1];
      avgB += labColor[2];
    }

    avgL /= surroundingColors.length;
    avgA /= surroundingColors.length;
    avgB /= surroundingColors.length;

    const baseLab = baseColor.lab();
    const adjustedL = baseLab[0] * 0.5 + avgL * 0.5;
    const adjustedA = baseLab[1] * 0.5 + avgA * 0.5;
    const adjustedB = baseLab[2] * 0.5 + avgB * 0.5;

    const adjustedColor = chroma.lab(adjustedL, adjustedA, adjustedB);

    return adjustedColor.hex();
  } catch (error) {
    console.error("Error in perceivedColor:", error);
    return baseColorHex; // Return original if error
  }
}

/**
 * Subtracts the ground color's influence from the base color.
 * This function emulates the "subtraction of color" principle, aiming to
 * create harmonious palettes by subtly shifting colors away from a dominant
 * "ground" color.
 */
export function subtractColor(
  baseColorHex: string,
  groundColorHex: string,
  subtractionFactor: number = 0.1,
): string {
  try {
    const baseColor = chroma(baseColorHex);
    const groundColor = chroma(groundColorHex);

    const baseLab = baseColor.lab();
    const groundLab = groundColor.lab();

    // Calculate the difference in Lab color space
    const deltaA = groundLab[1] - baseLab[1];
    const deltaB = groundLab[2] - baseLab[2];

    // Apply the subtraction factor to the difference
    const adjustedA = baseLab[1] - deltaA * subtractionFactor;
    const adjustedB = baseLab[2] - deltaB * subtractionFactor;

    const adjustedColor = chroma.lab(baseLab[0], adjustedA, adjustedB);

    return adjustedColor.hex();
  } catch (error) {
    console.error("Error in subtractColor:", error);
    return baseColorHex; // Return original if error
  }
}

/**
 * Calculates the relative luminance of a color.
 * This function is essential for determining contrast ratios and ensuring
 * accessibility.
 */
export function relativeLuminance(colorHex: string): number {
  try {
    const color = chroma(colorHex);
    const [r, g, b] = color.rgb();
    const [rr, gg, bb] = [r, g, b].map((c) => {
      const cc = c / 255;
      if (cc <= 0.03928) {
        return cc / 12.92;
      }
      return Math.pow((cc + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
  } catch (error) {
    console.error("Error in relativeLuminance:", error);
    return 0; // Default luminance
  }
}

/**
 * Calculates the contrast ratio between two colors.
 * This function helps ensure that foreground and background colors provide
 * sufficient contrast for readability, meeting accessibility guidelines.
 */
export function contrastRatio(
  foregroundHex: string,
  backgroundHex: string,
): number {
  try {
    const l1 = relativeLuminance(foregroundHex);
    const l2 = relativeLuminance(backgroundHex);

    const brighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (brighter + 0.05) / (darker + 0.05);
  } catch (error) {
    console.error("Error in contrastRatio:", error);
    return 1; // Default contrast ratio
  }
}

/**
 * Finds the middle color between two colors in Lab color space.
 * This function helps achieve visual balance and harmony by identifying
 * a color that is equidistant between two other colors in a perceptual sense.
 */
export function middleColor(color1Hex: string, color2Hex: string): string {
  try {
    const color1 = chroma(color1Hex);
    const color2 = chroma(color2Hex);

    const lab1 = color1.lab();
    const lab2 = color2.lab();

    const middleL = (lab1[0] + lab2[0]) / 2;
    const middleA = (lab1[1] + lab2[1]) / 2;
    const middleB = (lab1[2] + lab2[2]) / 2;

    const middleColor = chroma.lab(middleL, middleA, middleB);

    return middleColor.hex();
  } catch (error) {
    console.error("Error in middleColor:", error);
    return color1Hex; // Return original if error
  }
}

/**
 * Adjusts boundaries of a base color to create the illusion of space.
 * This function simulates the effect of "softer" or "harder" boundaries,
 * which can create a sense of nearness or distance.
 */
export function adjustBoundaries(
  baseColorHex: string,
  softnessFactor: number = 0.5,
  direction: "softer" | "harder" = "softer",
): string {
  try {
    const baseColor = chroma(baseColorHex);
    const baseLab = baseColor.lab();
    let adjustedL: number = baseLab[0];

    if (direction === "softer") {
      adjustedL = Math.max(0, baseLab[0] - softnessFactor * 10);
    } else {
      adjustedL = Math.min(100, baseLab[0] + softnessFactor * 10);
    }

    const adjustedColor = chroma.lab(adjustedL, baseLab[1], baseLab[2]);
    return adjustedColor.hex();
  } catch (error) {
    console.error("Error in adjustBoundaries:", error);
    return baseColorHex;
  }
}

/**
 * Modifies emphasis by adjusting quantity of color.
 * This function simulates the effect of using more or less of a color,
 * which can influence its perceived importance and visual weight.
 */
export function modifyEmphasis(
  baseColorHex: string,
  emphasisFactor: number = 0.2,
  direction: "more" | "less" = "more",
): string {
  try {
    const baseColor = chroma(baseColorHex);
    const baseLab = baseColor.lab();
    let adjustedA: number = baseLab[1];
    let adjustedB: number = baseLab[2];

    if (direction === "more") {
      adjustedA = baseLab[1] * (1 + emphasisFactor);
      adjustedB = baseLab[2] * (1 + emphasisFactor);
    } else {
      adjustedA = baseLab[1] * (1 - emphasisFactor);
      adjustedB = baseLab[2] * (1 - emphasisFactor);
    }

    const adjustedColor = chroma.lab(baseLab[0], adjustedA, adjustedB);
    return adjustedColor.hex();
  } catch (error) {
    console.error("Error in modifyEmphasis:", error);
    return baseColorHex;
  }
}

/**
 * Simulates the effect of light temperature on a color.
 * Note: This is a simplified approximation. Realistic lighting simulation
 * requires more sophisticated techniques.
 */
export function adjustForLightTemperature(
  colorHex: string,
  temperatureKelvin: number,
): string {
  try {
    const color = chroma(colorHex);
    const [r, g, b] = color.rgb();

    let rr = r / 255;
    let bb = b / 255;
    const gg = g / 255;

    if (temperatureKelvin < 5000) {
      // Warmer light
      rr = Math.min(1, rr * (1 + (5000 - temperatureKelvin) / 10000));
    } else {
      // Cooler light
      bb = Math.min(1, bb * (1 + (temperatureKelvin - 5000) / 10000));
    }

    const adjustedColor = chroma(rr * 255, g, bb * 255);

    return adjustedColor.hex();
  } catch (error) {
    console.error("Error in adjustForLightTemperature:", error);
    return colorHex;
  }
}

/**
 * Simulates the effect of a material on a color.
 * Note: This is a highly stylized approximation. Realistic material
 * rendering requires advanced techniques.
 */
export function applyMaterialProfile(
  colorHex: string,
  material: string,
): string {
  try {
    const color = chroma(colorHex);
    const [r, g, b] = color.rgb();
    let rr = r / 255;
    let gg = g / 255;
    let bb = b / 255;

    switch (material) {
      case "matte":
        // Reduce highlights (darken slightly)
        rr = Math.max(0, rr - 0.05);
        gg = Math.max(0, gg - 0.05);
        bb = Math.max(0, bb - 0.05);
        break;
      case "glossy":
        // Add specular highlight (add a touch of white, biased towards green)
        gg = Math.min(1, gg + 0.1);
        break;
      case "metallic": {
        // Simulate metallic reflection (add a subtle gradient - very rough)
        const avg = (rr + gg + bb) / 3;
        rr = Math.min(1, rr + (1 - rr) * 0.1);
        gg = Math.min(1, gg + (1 - gg) * 0.1);
        bb = Math.min(1, bb + (1 - bb) * 0.1);
        break;
      }
      case "none":
        break;
    }
    const adjustedColor = chroma(rr * 255, gg * 255, bb * 255);
    return adjustedColor.hex();
  } catch (error) {
    console.error("Error in applyMaterialProfile:", error);
    return colorHex;
  }
}

/**
 * Helper function to generate random colors (for example purposes).
 */
export function generateRandomColors(numColors: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < numColors; i++) {
    colors.push("#" + Math.floor(Math.random() * 16777215).toString(16));
  }
  return colors;
}

/**
 * Generates a palette based on color relativity.
 */
export function generateRelativityPalette(
  baseColorHex: string,
  numColors: number = 5,
): string[] {
  const palette: string[] = [baseColorHex];
  const surroundingColors = generateRandomColors(numColors - 1);

  for (const color of surroundingColors) {
    palette.push(perceivedColor(baseColorHex, [color]));
  }
  return palette;
}

/**
 * Generates a palette by subtracting a ground color.
 */
export function generateSubtractionPalette(
  baseColorHex: string,
  groundColorHex: string,
  numColors: number = 5,
): string[] {
  const palette: string[] = [baseColorHex];
  for (let i = 0; i < numColors - 1; i++) {
    palette.push(subtractColor(baseColorHex, groundColorHex, (i + 1) * 0.1));
  }
  return palette;
}

/**
 * Generates a monochromatic palette of color variations by adjusting color boundaries
 */
export function generateMonochromaticPalette(
  baseColorHex: string,
  numColors: number = 5,
): string[] {
  const palette: string[] = [baseColorHex];
  for (let i = 0; i < numColors - 1; i++) {
    palette.push(adjustBoundaries(baseColorHex, (i + 1) * 0.1));
  }
  return palette;
}

/**
 * Calculates the average color (in Lab space) of a palette.
 * This is used to estimate the overall "vibe" of a color scheme.
 */
export function calculateAverageColor(paletteHex: string[]): {
  l: number;
  a: number;
  b: number;
} {
  let totalL = 0;
  let totalA = 0;
  let totalB = 0;

  for (const colorHex of paletteHex) {
    try {
      const color = chroma(colorHex);
      const labColor = color.lab();
      totalL += labColor[0];
      totalA += labColor[1];
      totalB += labColor[2];
    } catch (error) {
      console.error("Error in calculateAverageColor (skipping color):", error);
      continue; // Skip problematic colors
    }
  }

  const numColors = paletteHex.length;
  return {
    l: totalL / numColors,
    a: totalA / numColors,
    b: totalB / numColors,
  };
}

/**
 * Calculates a basic 'vibe shift' value by comparing the avg color before and after
 * A higher shift value indicates more movement and change of color (Use for bezold visualization)
 */
export function calculateVibeShift(
  palette1Hex: string[],
  palette2Hex: string[],
): number {
  const avg1 = calculateAverageColor(palette1Hex);
  const avg2 = calculateAverageColor(palette2Hex);

  // Calculate the Euclidean distance in Lab space (simplified)
  const deltaL = avg2.l - avg1.l;
  const deltaA = avg2.a - avg1.a;
  const deltaB = avg2.b - avg1.b;

  return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
}

/**
 * Attempts to simulate 'Film Color' by creating a semi-transparent, layered effect,
 */
export function createFilmColorPalette(
  baseColorHex: string,
  numLayers: number = 4,
  opacity: number = 0.1,
): string[] {
  const palette: string[] = [baseColorHex];
  try {
    const baseColor = chroma(baseColorHex);
    const [r, g, b] = baseColor.rgb();
    let rr = r / 255;
    let gg = g / 255;
    let bb = b / 255;

    for (let i = 1; i < numLayers; i++) {
      rr = Math.min(1, rr + (1 - rr) * opacity);
      gg = Math.min(1, gg + (1 - gg) * opacity);
      bb = Math.min(1, bb + (1 - bb) * opacity);

      const adjustedColor = chroma(rr * 255, gg * 255, bb * 255);
      palette.push(adjustedColor.hex());
    }

    return palette;
  } catch (error) {
    console.error("Error in createFilmColorPalette: ", error);
    return palette;
  }
}

// --- The End ---
