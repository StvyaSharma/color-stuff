// @ts-nocheck
// exampleUsage.ts

import {
  // Device
  applyDeviceProfile,
  autoAdjustForAccessibility,
  exportColorFormats,
  // Harmony
  generateColorHarmonies,
  generateComplementary,
  // Accessibility
  getContrastRatio,
  // Gradient
  GradientGenerator,
  // Palette
  hexToHSL,
  meetsContrastGuidelines,
  simulateCVD,
  // Utils
  sortByHue,
  // Core
  toIColor,
  validatePaletteAccessibility,
} from "./index.ts";

// 1. Core: Convert hex to IColor
const colorA = toIColor("#ff0000");
const colorB = toIColor("#0000ff");

// 2. Gradient Generation: Using GradientGenerator class
const gradientGenerator = new GradientGenerator();
const gradientOutput = gradientGenerator.generateGradient({
  colors: [colorA.hex, colorB.hex],
  type: "linear",
  steps: 10,
});
console.log("Generated gradient:", gradientOutput);

// 3. Accessibility: Contrast ratio and guidelines check
const contrastRatio = getContrastRatio(colorA, colorB);
console.log("Contrast ratio:", contrastRatio);
console.log("Meets WCAG AA:", meetsContrastGuidelines(colorA, colorB, "AA"));

// Simulate Color Vision Deficiency
const simulatedCVD = simulateCVD(colorA, "protanopia");
console.log("Protanopia simulation:", simulatedCVD);

// Validate entire palette for accessibility
const palette = [colorA, colorB, toIColor("#00ff00")];
const paletteValidation = validatePaletteAccessibility(palette, "AA");
console.log("Palette accessibility:", paletteValidation);

// Automatically adjust a color for accessibility
const adjustedColor = autoAdjustForAccessibility(
  colorA,
  toIColor("#ffffff"),
  "AA",
);
console.log("Adjusted color for accessibility:", adjustedColor);

// 4. Palette: Generate complementary color (using HSL)
const colorAHSL = hexToHSL(colorA.hex);
const complementaryHSL = generateComplementary(colorAHSL);
console.log("Complementary color in HSL:", complementaryHSL);

// 5. Harmony: Generate color harmonies
const harmonies = generateColorHarmonies(colorAHSL);
console.log("Color harmonies:", harmonies);

// 6. Device: Apply a device profile and export color formats
const mockProfile = {
  name: "MockDevice",
  gamma: 2.2,
  whitePoint: [0.95, 1.0, 1.09] as [number, number, number],
};
const profiledColor = applyDeviceProfile(colorA, mockProfile);
const exportedFormats = exportColorFormats(profiledColor);
console.log("Exported color formats:", exportedFormats);

// 7. Utils: Sort a palette by hue
const sortedPalette = sortByHue(palette);
console.log("Sorted palette by hue:", sortedPalette);
