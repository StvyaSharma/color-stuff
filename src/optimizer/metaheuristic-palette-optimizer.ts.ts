// @ts-nocheck
import chroma, { Color } from "chroma-js";

/**
 * Configuration interface for color optimization
 */
interface ColorConfiguration {
  targetColors: string[];
  avoidColors: string[];
  providedColors: string[];
  fixedColors: number;
  backgroundColor: string;
}

/**
 * Default configuration values
 */
const defaultConfig: ColorConfiguration = {
  targetColors: [
    "#4269d0", // Blue
    "#efb118", // Yellow
    "#ff725c", // Coral
    "#6cc5b0", // Teal
    "#3ca951", // Green
    "#ff8ab7", // Pink
    "#a463f2", // Purple
    "#97bbf5", // Light Blue
    "#9c6b4e", // Brown
    "#9498a0", // Gray
  ],
  avoidColors: [
    "#FF0000", // Pure red (avoid for accessibility)
    "#000000", // Pure black (avoid for contrast)
  ],
  providedColors: [
    "#4269d0", // Blue
    "#efb118", // Yellow
    "#ff725c", // Coral
    "#6cc5b0", // Teal
    "#3ca951", // Green
    "#ff8ab7", // Pink
    "#a463f2", // Purple
    "#97bbf5", // Light Blue
    "#9c6b4e", // Brown
    "#9498a0", // Gray
  ],
  fixedColors: 0,
  backgroundColor: "#ffffff",
};

/**
 * Configuration: Target Colors
 * These colors serve as guidelines for the optimization algorithm.
 * The algorithm will try to generate colors that are perceptually
 * similar to these while maintaining distinctiveness.
 */
const targetColors: string[] = [
  "#4269d0", // Blue
  "#efb118", // Yellow
  "#ff725c", // Coral
  "#6cc5b0", // Teal
  "#3ca951", // Green
  "#ff8ab7", // Pink
  "#a463f2", // Purple
  "#97bbf5", // Light Blue
  "#9c6b4e", // Brown
  "#9498a0", // Gray
];

/**
 * Configuration: Colors to Avoid
 * The algorithm will try to maintain a minimum perceptual
 * distance from these colors.
 */
const avoidColors: string[] = [
  "#FF0000", // Pure red (avoid for accessibility)
  "#000000", // Pure black (avoid for contrast)
];

/**
 * Configuration: Initial Colors
 * Starting point for the optimization algorithm.
 * These colors will be refined during the optimization process.
 */
const providedColors: string[] = [
  "#4269d0", // Blue
  "#efb118", // Yellow
  "#ff725c", // Coral
  "#6cc5b0", // Teal
  "#3ca951", // Green
  "#ff8ab7", // Pink
  "#a463f2", // Purple
  "#97bbf5", // Light Blue
  "#9c6b4e", // Brown
  "#9498a0", // Gray
];

/** Number of colors that should remain fixed during optimization */
const fixedColors = 0;

/** Background color for contrast calculations */
const backgroundColor = "#ffffff";

/**
 * Returns a random element from an array
 *
 * @template T - The type of elements in the array
 * @param {T[]} array - The input array
 * @returns {T} A random element from the array
 *
 * @example
 * const colors = ["red", "green", "blue"];
 * const randomColor = randomFromArray(colors); // Might return "green"
 */
const randomFromArray = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Generates a random color using chroma-js
 *
 * @returns {Color} A random chroma-js color object
 *
 * @example
 * const color = randomColor();
 * console.log(color.hex()); // e.g., "#ff4281"
 */
const randomColor = (): Color => {
  return chroma.random();
};

/**
 * Calculates the perceptual distance between two colors using CIEDE2000
 *
 * @param {Color} color1 - First color
 * @param {Color} color2 - Second color
 * @returns {number} The perceptual distance between the colors
 *
 * @example
 * const red = chroma("#FF0000");
 * const blue = chroma("#0000FF");
 * const dist = distance(red, blue); // Returns perceptual distance
 */
const distance = (color1: Color, color2: Color): number =>
  chroma.deltaE(color1, color2);

/**
 * Finds the closest color from an array to a given color
 *
 * @param {Color} color - The reference color
 * @param {Color[]} colorArray - Array of colors to compare against
 * @returns {Color} The color from the array closest to the reference color
 *
 * @example
 * const targetColor = chroma("#FF0000");
 * const palette = [chroma("#FF0088"), chroma("#FF8800")];
 * const closest = getClosestColor(targetColor, palette);
 */
const getClosestColor = (color: Color, colorArray: Color[]): Color => {
  const distances = colorArray.map((c) => distance(color, c));
  const minIndex = distances.indexOf(Math.min(...distances));
  return colorArray[minIndex];
};

/**
 * Calculates distances between all pairs of colors in an array,
 * optionally applying color vision deficiency simulation
 *
 * @param {Color[]} colorArray - Array of colors to analyze
 * @param {string} visionSpace - Type of color vision to simulate (e.g., "Normal", "Protanopia")
 * @returns {number[]} Array of distances between all color pairs
 *
 * @example
 * const palette = [chroma("red"), chroma("blue"), chroma("green")];
 * const normalDistances = distances(palette);
 * const protanopiaDistances = distances(palette, "Protanopia");
 */
const distances = (
  colorArray: Color[],
  visionSpace: string = "Normal",
): number[] => {
  const distances: number[] = [];
  // Convert colors to simulated color space if needed
  const convertedColors = colorArray.map((c) =>
    chroma(brettelFunctions[visionSpace](c.rgb()) as [number, number, number]),
  );

  // Calculate distances between all pairs
  for (let i = 0; i < colorArray.length; i++) {
    for (let j = i + 1; j < colorArray.length; j++) {
      distances.push(distance(convertedColors[i], convertedColors[j]));
    }
  }
  return distances;
};

/**
 * Calculates the arithmetic mean of an array of numbers
 *
 * @param {number[]} array - Array of numbers
 * @returns {number} The average value
 *
 * @example
 * const values = [1, 2, 3, 4, 5];
 * const avg = average(values); // Returns 3
 */
const average = (array: number[]): number =>
  array.reduce((a, b) => a + b) / array.length;

/**
 * Calculates the range (difference between max and min values) of an array
 *
 * @param {number[]} array - Array of numbers
 * @returns {number} The range of values
 *
 * @example
 * const values = [1, 5, 3, 9, 2];
 * const valueRange = range(values); // Returns 8 (9 - 1)
 */
const range = (array: number[]): number => {
  const sorted = array.sort((a, b) => a - b);
  return sorted[sorted.length - 1] - sorted[0];
};

/**
 * Generates a new color that's slightly different from the input color
 * Used for exploring nearby color space during optimization
 *
 * @param {Color} color - The original color
 * @returns {Color} A new color with small random changes
 *
 * @example
 * const color = chroma("#FF0000");
 * const similar = randomNearbyColor(color);
 */
const randomNearbyColor = (color: Color): Color => {
  // Choose a random RGB channel to modify
  const channelToChange = randomFromArray([0, 1, 2]);
  const oldVal = color.gl()[channelToChange];

  // Modify the channel value by up to ±0.05
  let newVal = oldVal + Math.random() * 0.1 - 0.05;
  // Clamp to valid range
  newVal = Math.max(0, Math.min(1, newVal));

  return color.set(`rgb.${"rgb"[channelToChange]}`, newVal * 255);
};

/**
 * Calculates the average perceptual distance between test colors and their
 * closest matches in a given set of colors
 *
 * @param {Color[]} testColors - Colors to test
 * @param {Color[]} givenColors - Reference colors to compare against
 * @returns {number} Average distance to closest matches
 */
const averageDistanceFromColors = (
  testColors: Color[],
  givenColors: Color[],
): number => {
  const distances = testColors.map((c) =>
    distance(c, getClosestColor(c, givenColors)),
  );
  return average(distances);
};

/**
 * Finds the maximum perceptual distance between test colors and their
 * closest matches in a given set of colors
 *
 * @param {Color[]} testColors - Colors to test
 * @param {Color[]} givenColors - Reference colors to compare against
 * @returns {number} Maximum distance to closest match
 */
const maxDistanceFromColors = (
  testColors: Color[],
  givenColors: Color[],
): number => {
  const distances = testColors.map((c) =>
    distance(c, getClosestColor(c, givenColors)),
  );
  return Math.max(...distances);
};

/**
 * Finds the minimum perceptual distance between test colors and their
 * closest matches in a given set of colors
 *
 * @param {Color[]} testColors - Colors to test
 * @param {Color[]} givenColors - Reference colors to compare against
 * @returns {number} Minimum distance to closest match
 */
const minDistanceFromColors = (
  testColors: Color[],
  givenColors: Color[],
): number => {
  const distances = testColors.map((c) =>
    distance(c, getClosestColor(c, givenColors)),
  );
  return Math.min(...distances);
};

// Color Vision Deficiency Simulation Functions

/**
 * Converts a linear RGB value to sRGB
 *
 * @param {number} v - Linear RGB value
 * @returns {number} sRGB value
 */
const linearRGB_from_sRGB = (v: number): number => {
  const fv = v / 255.0;
  if (fv < 0.04045) return fv / 12.92;
  return Math.pow((fv + 0.055) / 1.055, 2.4);
};

/**
 * Converts an sRGB value to linear RGB
 *
 * @param {number} v - sRGB value
 * @returns {number} Linear RGB value
 */
const sRGB_from_linearRGB = (v: number): number => {
  if (v <= 0) return 0;
  if (v >= 1) return 255;
  if (v < 0.0031308) return 0.5 + v * 12.92 * 255;
  return 0 + 255 * (Math.pow(v, 1.0 / 2.4) * 1.055 - 0.055);
};

/**
 * Collection of color vision simulation functions for different types of CVD
 */
const brettelFunctions: { [key: string]: (v: number[]) => number[] } = {
  Normal: function (v: number[]): number[] {
    return v;
  },
  Protanopia: function (v: number[]): number[] {
    return brettel(v, "protan", 1.0);
  },
  Protanomaly: function (v: number[]): number[] {
    return brettel(v, "protan", 0.6);
  },
  Deuteranopia: function (v: number[]): number[] {
    return brettel(v, "deutan", 1.0);
  },
  Deuteranomaly: function (v: number[]): number[] {
    return brettel(v, "deutan", 0.6);
  },
  Tritanopia: function (v: number[]): number[] {
    return brettel(v, "tritan", 1.0);
  },
  Tritanomaly: function (v: number[]): number[] {
    return brettel(v, "tritan", 0.6);
  },
  Achromatopsia: function (v: number[]): number[] {
    return monochrome_with_severity(v, 1.0);
  },
  Achromatomaly: function (v: number[]): number[] {
    return monochrome_with_severity(v, 0.6);
  },
};

// Lookup table for performance
var sRGB_to_linearRGB_Lookup: number[] = Array(256);
(function () {
  for (let i = 0; i < 256; i++) {
    sRGB_to_linearRGB_Lookup[i] = linearRGB_from_sRGB(i);
  }
})();

/**
 * Parameters for the Brettel model of color vision deficiency
 */
const brettel_params: { [key: string]: any } = {
  protan: {
    rgbCvdFromRgb_1: [
      0.1451, 1.20165, -0.34675, 0.10447, 0.85316, 0.04237, 0.00429, -0.00603,
      1.00174,
    ],
    rgbCvdFromRgb_2: [
      0.14115, 1.16782, -0.30897, 0.10495, 0.8573, 0.03776, 0.00431, -0.00586,
      1.00155,
    ],
    separationPlaneNormal: [0.00048, 0.00416, -0.00464],
  },
  deutan: {
    rgbCvdFromRgb_1: [
      0.36198, 0.86755, -0.22953, 0.26099, 0.64512, 0.09389, -0.01975, 0.02686,
      0.99289,
    ],
    rgbCvdFromRgb_2: [
      0.37009, 0.8854, -0.25549, 0.25767, 0.63782, 0.10451, -0.0195, 0.02741,
      0.99209,
    ],
    separationPlaneNormal: [-0.00293, -0.00645, 0.00938],
  },
  tritan: {
    rgbCvdFromRgb_1: [
      1.01354, 0.14268, -0.15622, -0.01181, 0.87561, 0.13619, 0.07707, 0.81208,
      0.11085,
    ],
    rgbCvdFromRgb_2: [
      0.93337, 0.19999, -0.13336, 0.05809, 0.82565, 0.11626, -0.37923, 1.13825,
      0.24098,
    ],
    separationPlaneNormal: [0.0396, -0.02831, -0.01129],
  },
};

/**
 * Implements the Brettel (1997) method for simulating color vision deficiency
 *
 * @param {number[]} srgb - Input color in sRGB space
 * @param {string} t - Type of color vision deficiency ('protan', 'deutan', or 'tritan')
 * @param {number} severity - Severity of the color vision deficiency (0 to 1)
 * @returns {number[]} Simulated color in sRGB space
 *
 * @example
 * const color = [255, 0, 0];  // Pure red
 * const protanopiaColor = brettel(color, 'protan', 1.0);
 */
function brettel(srgb: number[], t: string, severity: number): number[] {
  // Convert from sRGB to linear RGB
  const rgb = Array(3);
  rgb[0] = sRGB_to_linearRGB_Lookup[srgb[0]];
  rgb[1] = sRGB_to_linearRGB_Lookup[srgb[1]];
  rgb[2] = sRGB_to_linearRGB_Lookup[srgb[2]];

  // Get parameters for the specified type of CVD
  const params = brettel_params[t];
  const separationPlaneNormal = params["separationPlaneNormal"];
  const rgbCvdFromRgb_1 = params["rgbCvdFromRgb_1"];
  const rgbCvdFromRgb_2 = params["rgbCvdFromRgb_2"];

  // Determine which transformation matrix to use based on the separation plane
  const dotWithSepPlane =
    rgb[0] * separationPlaneNormal[0] +
    rgb[1] * separationPlaneNormal[1] +
    rgb[2] * separationPlaneNormal[2];
  const rgbCvdFromRgb =
    dotWithSepPlane >= 0 ? rgbCvdFromRgb_1 : rgbCvdFromRgb_2;

  // Transform the color
  const rgb_cvd = Array(3);
  rgb_cvd[0] =
    rgbCvdFromRgb[0] * rgb[0] +
    rgbCvdFromRgb[1] * rgb[1] +
    rgbCvdFromRgb[2] * rgb[2];
  rgb_cvd[1] =
    rgbCvdFromRgb[3] * rgb[0] +
    rgbCvdFromRgb[4] * rgb[1] +
    rgbCvdFromRgb[5] * rgb[2];
  rgb_cvd[2] =
    rgbCvdFromRgb[6] * rgb[0] +
    rgbCvdFromRgb[7] * rgb[1] +
    rgbCvdFromRgb[8] * rgb[2];

  // Apply severity factor through linear interpolation
  rgb_cvd[0] = rgb_cvd[0] * severity + rgb[0] * (1.0 - severity);
  rgb_cvd[1] = rgb_cvd[1] * severity + rgb[1] * (1.0 - severity);
  rgb_cvd[2] = rgb_cvd[2] * severity + rgb[2] * (1.0 - severity);

  // Convert back to sRGB
  return [
    sRGB_from_linearRGB(rgb_cvd[0]),
    sRGB_from_linearRGB(rgb_cvd[1]),
    sRGB_from_linearRGB(rgb_cvd[2]),
  ];
}

/**
 * Simulates monochrome vision (complete color blindness) with adjustable severity
 *
 * @param {number[]} srgb - Input color in sRGB space
 * @param {number} severity - Severity of the color vision deficiency (0 to 1)
 * @returns {number[]} Simulated monochrome color
 *
 * @example
 * const color = [255, 0, 0];  // Pure red
 * const monochromeColor = monochrome_with_severity(color, 1.0);
 */
function monochrome_with_severity(srgb: number[], severity: number): number[] {
  // Convert to grayscale using standard luminance weights
  const z = Math.round(srgb[0] * 0.299 + srgb[1] * 0.587 + srgb[2] * 0.114);

  // Interpolate between original color and grayscale based on severity
  const r = z * severity + (1.0 - severity) * srgb[0];
  const g = z * severity + (1.0 - severity) * srgb[1];
  const b = z * severity + (1.0 - severity) * srgb[2];

  return [r, g, b];
}

/**
 * Calculates the overall cost (fitness) of a color palette
 * Lower costs indicate better palettes
 *
 * @param {Color[]} state - Array of colors to evaluate
 * @param {ColorConfiguration} config - Color configuration parameters
 * @returns {number} Cost value (lower is better)
 */
const cost = (state: Color[], config: ColorConfiguration): number => {
  // Weights for different optimization criteria
  const energyWeight = 1.25; // Weight for overall perceptual distance
  const rangeWeight = 1; // Weight for spread of distances
  const targetWeight = 0.75; // Weight for matching target colors
  const avoidWeight = 0.5; // Weight for avoiding specific colors
  const contrastWeight = 0.25; // Weight for background contrast

  // Weights for different types of color vision
  const protanopiaWeight = 0.1;
  const protanomalyWeight = 0.1;
  const deuteranopiaWeight = 0.1;
  const deuteranomalyWeight = 0.5;
  const tritanopiaWeight = 0.05;
  const tritanomalyWeight = 0.05;

  // Calculate distances for different vision types
  const normalDistances = distances(state);
  const protanopiaDistances = distances(state, "Protanopia");
  const protanomalyDistances = distances(state, "Protanomaly");
  const deuteranopiaDistances = distances(state, "Deuteranopia");
  const deuteranomalyDistances = distances(state, "Deuteranomaly");
  const tritanopiaDistances = distances(state, "Tritanopia");
  const tritanomalyDistances = distances(state, "Tritanomaly");

  // Calculate individual scores (lower is better)
  const energyScore = 100 - average(normalDistances);
  const rangeScore = range(normalDistances);
  const targetScore = config.targetColors.length
    ? averageDistanceFromColors(
        state,
        config.targetColors.map((c) => chroma(c)),
      )
    : 0;
  const avoidScore = config.avoidColors.length
    ? 100 -
      minDistanceFromColors(
        state,
        config.avoidColors.map((c) => chroma(c)),
      )
    : 0;

  const protanopiaScore = 100 - average(protanopiaDistances);
  const protanomalyScore = 100 - average(protanomalyDistances);
  const deuteranopiaScore = 100 - average(deuteranopiaDistances);
  const deuteranomalyScore = 100 - average(deuteranomalyDistances);
  const tritanopiaScore = 100 - average(tritanopiaDistances);
  const tritanomalyScore = 100 - average(tritanomalyDistances);

  // Calculate contrast score
  const maxPossibleContrast = 21; // Theoretical maximum contrast ratio in WCAG
  const minContrast = state.reduce(
    (acc, color) =>
      Math.min(chroma.contrast(color, config.backgroundColor), acc),
    maxPossibleContrast,
  );
  const contrastScore = 100 - (minContrast / maxPossibleContrast) * 100;

  // Combine all scores with their weights
  return (
    energyWeight * energyScore +
    targetWeight * targetScore +
    rangeWeight * rangeScore +
    avoidWeight * avoidScore +
    protanopiaWeight * protanopiaScore +
    protanomalyWeight * protanomalyScore +
    deuteranopiaWeight * deuteranopiaScore +
    deuteranomalyWeight * deuteranomalyScore +
    tritanopiaWeight * tritanopiaScore +
    tritanomalyWeight * tritanomalyScore +
    contrastWeight * contrastScore
  );
};

/**
 * Main optimization function using simulated annealing
 * Attempts to find an optimal set of colors based on multiple criteria
 *
 * @param {number} n - Number of colors to generate
 * @param {ColorConfiguration} config - Color configuration parameters
 * @returns {Color[]} Array of optimized colors
 *
 * @example
 * // Generate 5 optimized colors with custom configuration
 * const customConfig = { ...defaultConfig, targetColors: ["#FF0000", "#00FF00"] };
 * const colors = optimize(5, customConfig);
 * colors.forEach(c => console.log(c.hex()));
 */
const optimize = (
  n: number = 5,
  config: ColorConfiguration = defaultConfig,
): Color[] => {
  // Initialize colors array with provided colors
  const colors: Color[] = [];
  config.providedColors.forEach((color) => colors.push(chroma(color)));

  // Add random colors until we reach desired count
  for (let i = config.fixedColors + config.providedColors.length; i < n; i++) {
    colors.push(randomColor());
  }

  // Store initial state for comparison
  const startColors = Array.from(colors);
  const startCost = cost(startColors, config);

  // Simulated annealing parameters
  let temperature = 1000; // Starting temperature
  const coolingRate = 0.99; // How quickly temperature decreases
  const cutoff = 0.0001; // When to stop optimizing

  // Main optimization loop
  while (temperature > cutoff) {
    // Try to optimize each color
    for (let i = config.fixedColors; i < colors.length; i++) {
      const newColors = colors.map((color) => color);
      // Generate a nearby variation
      newColors[i] = randomNearbyColor(newColors[i]);

      // Calculate cost difference
      const delta = cost(newColors, config) - cost(colors, config);
      // Probability of accepting worse solution decreases with temperature
      const probability = Math.exp(-delta / temperature);

      // Accept new solution if better or randomly based on probability
      if (Math.random() < probability) {
        colors[i] = newColors[i];
      }
    }

    console.log(`Current cost: ${cost(colors, config)}`);
    temperature *= coolingRate; // Cool down
  }

  // Log results
  console.log(`
Start colors: ${startColors.map((color) => color.hex())}
Start cost: ${startCost}
Final colors: ${colors.reduce((acc, color) => acc + `"${color.hex()}" `, "")}
Final cost: ${cost(colors, config)}
Cost difference: ${cost(colors, config) - startCost}`);

  return colors;
};

// Run optimization with default configuration when file is run directly
// if (import.meta.main) {
// optimize(10, defaultConfig);
// }

export { optimize };
