/**
 * @file gradients/generator.ts
 * Provides classes and functions for generating various types of color gradients
 * using perceptually uniform color spaces and advanced interpolation.
 */

import type { ColorInput, IColor, Palette } from "../core/color.types";
import { fromIColor, toIColor } from "../core/conversions";
import { colorDifference } from "../core/operations";
import { interpolateColor } from "./interpolation";
import { renderCssGradient, renderSvgGradient } from "./rendering";
import type {
  ColorStop,
  GradientMetadata,
  GradientOptions,
  GradientOutput,
  GradientType,
} from "./gradient.types";
import { SimplexNoise } from "../utils/noise"; // Assuming noise utils exist
import { randomInt } from "../utils/math";

/**
 * Base class for gradient generation. Handles common setup like color parsing.
 * @abstract
 */
abstract class BaseGradient {
  protected stops: ColorStop[];
  protected options: GradientOptions;

  /**
   * Initializes the gradient generator with common options.
   * @param options - Gradient generation options.
   */
  constructor(options: GradientOptions) {
    this.options = { ...options }; // Store options
    this.stops = this.parseAndSortStops(options.colors);

    if (this.stops.length < 2) {
      throw new Error("Gradient generation requires at least two color stops.");
    }
  }

  /**
   * Parses color inputs into structured ColorStop objects and sorts them by position.
   * Assigns equidistant positions if none are provided.
   * @param colors - Array of ColorInput or ColorStop objects.
   * @returns An array of sorted ColorStop objects.
   * @private
   */
  private parseAndSortStops(colors: (ColorInput | ColorStop)[]): ColorStop[] {
    let stops: ColorStop[] = colors.map((item) => {
      if (typeof item === "object" && item !== null && "color" in item) {
        // Already a ColorStop object
        const stop = item as ColorStop;
        return {
          color: toIColor(stop.color), // Ensure internal color format
          position: stop.position, // Keep provided position
        };
      } else {
        // Just a ColorInput, position will be assigned later
        return { color: toIColor(item), position: undefined };
      }
    });

    // Assign default equidistant positions if any are missing
    const needsPositioning = stops.some((stop) => stop.position === undefined);
    if (needsPositioning) {
      if (stops.some((stop) => stop.position !== undefined)) {
        console.warn(
          "Mixing positioned and unpositioned stops may lead to unexpected results. Assigning equidistant positions to unpositioned stops.",
        );
        // Basic fill: Could be smarter by interpolating between known positions
        stops = stops.map((stop, index) => ({
          ...stop,
          position: stop.position ?? index / (stops.length - 1),
        }));
      } else {
        // Assign all positions equidistantly
        stops = stops.map((stop, index) => ({
          ...stop,
          position: index / (stops.length - 1),
        }));
      }
    }

    // Sort stops by position
    stops.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    // Ensure positions are clamped [0, 1] and the first is 0, last is 1
    if (stops.length > 0) {
      stops[0].position = 0;
      stops[stops.length - 1].position = 1;
      stops = stops.map((stop) => ({
        ...stop,
        position: Math.max(0, Math.min(1, stop.position ?? 0)),
      }));
    }

    return stops;
  }

  /**
   * Generates the gradient steps based on the specific gradient type implementation.
   * @returns An array of IColor objects representing the gradient steps.
   * @abstract
   */
  protected abstract generateSteps(): Palette;

  /**
   * Calculates metadata for the generated gradient steps, like perceptual distances.
   * @param gradientSteps - The array of generated IColor steps.
   * @returns Gradient metadata.
   */
  protected generateMetadata(gradientSteps: Palette): GradientMetadata {
    const distances: number[] = [];
    const contrastRatios: (number | null)[] = [];

    for (let i = 0; i < gradientSteps.length - 1; i++) {
      const dist = colorDifference(gradientSteps[i], gradientSteps[i + 1]);
      distances.push(dist);
      // Contrast ratio is less common for gradients but can be calculated
      // contrastRatios.push(getContrastRatio(gradientSteps[i], gradientSteps[i + 1]));
    }

    const averageDistance = distances.length > 0
      ? distances.reduce((sum, d) => sum + d, 0) / distances.length
      : 0;

    return {
      perceptualDistances: distances,
      averageDistance: averageDistance,
      // contrastRatios: contrastRatios,
    };
  }

  /**
   * High-level function to generate the full gradient output including steps, metadata, and renderings.
   * @returns A GradientOutput object.
   */
  public generate(): GradientOutput {
    const gradientSteps = this.generateSteps();
    const metadata = this.generateMetadata(gradientSteps);
    const css = renderCssGradient(
      this.getGradientType(),
      gradientSteps,
      this.options,
    );
    let svg;
    const type = this.getGradientType();
    if (type === "linear" || type === "radial") {
      try {
        svg = renderSvgGradient(type, gradientSteps, "gradient", this.options);
      } catch (e) {
        console.error("Failed to generate SVG gradient:", e);
      }
    }

    return {
      gradient: gradientSteps,
      metadata: metadata,
      css: css,
      svg: svg,
    };
  }

  /**
   * Must be implemented by subclasses to return their specific type.
   * @returns The GradientType.
   * @abstract
   */
  protected abstract getGradientType(): GradientType;
}

// --- Specific Gradient Implementations ---

/** Linear Gradient Generator */
export class LinearGradient extends BaseGradient {
  protected getGradientType(): GradientType {
    return "linear";
  }

  protected generateSteps(): Palette {
    const steps = this.options.steps;
    const gradient: Palette = [];
    const colorMode = this.options.colorMode ?? "lch";

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1); // Normalized position [0, 1]

      // Find the two stops surrounding t
      let startStop = this.stops[0];
      let endStop = this.stops[this.stops.length - 1];
      for (let j = 0; j < this.stops.length - 1; j++) {
        if (
          t >= (this.stops[j].position ?? 0) &&
          t <= (this.stops[j + 1].position ?? 1)
        ) {
          startStop = this.stops[j];
          endStop = this.stops[j + 1];
          break;
        }
      }

      // Normalize t within the current segment
      const segmentLength = (endStop.position ?? 1) - (startStop.position ?? 0);
      const segmentT = segmentLength === 0
        ? 0
        : (t - (startStop.position ?? 0)) / segmentLength;

      const interpolatedColor = interpolateColor(
        startStop.color,
        endStop.color,
        segmentT,
        colorMode,
      );
      gradient.push(interpolatedColor);
    }
    return gradient;
  }
}

/** Radial Gradient Generator */
export class RadialGradient extends BaseGradient {
  protected getGradientType(): GradientType {
    return "radial";
  }

  // Radial generation often uses the same interpolation logic as linear,
  // the difference is mainly in the CSS/SVG rendering based on shape/focal point.
  // We reuse the linear step generation logic here.
  protected generateSteps(): Palette {
    const steps = this.options.steps;
    const gradient: Palette = [];
    const colorMode = this.options.colorMode ?? "lch";

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);

      // Find surrounding stops based on t
      let startStop = this.stops[0];
      let endStop = this.stops[this.stops.length - 1];
      for (let j = 0; j < this.stops.length - 1; j++) {
        if (
          t >= (this.stops[j].position ?? 0) &&
          t <= (this.stops[j + 1].position ?? 1)
        ) {
          startStop = this.stops[j];
          endStop = this.stops[j + 1];
          break;
        }
      }

      // Normalize t within the segment
      const segmentLength = (endStop.position ?? 1) - (startStop.position ?? 0);
      const segmentT = segmentLength === 0
        ? 0
        : (t - (startStop.position ?? 0)) / segmentLength;

      const interpolatedColor = interpolateColor(
        startStop.color,
        endStop.color,
        segmentT,
        colorMode,
      );
      gradient.push(interpolatedColor);
    }
    return gradient;
  }
}

/** Angular (Conic) Gradient Generator */
export class AngularGradient extends BaseGradient {
  protected getGradientType(): GradientType {
    return "angular";
  }

  // Angular generation also reuses linear interpolation logic.
  // The rendering part handles the conic nature.
  protected generateSteps(): Palette {
    const steps = this.options.steps;
    const gradient: Palette = [];
    const colorMode = this.options.colorMode ?? "lch";

    // Angular gradients often need the last color to match the first for a smooth wrap.
    // Ensure the stops wrap correctly if needed, or handle in rendering.
    const stopsToInterpolate = [...this.stops];
    // Optional: Add first stop at the end with position 1 if not already there for smooth wrap
    if (
      this.stops[this.stops.length - 1].position !== 1 ||
      this.stops[0].color.hex !== this.stops[this.stops.length - 1].color.hex
    ) {
      // stopsToInterpolate.push({...this.stops[0], position: 1}); // Re-add first stop at the end
    }

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1); // Generate steps up to t=1

      // Find surrounding stops
      let startStop = stopsToInterpolate[0];
      let endStop = stopsToInterpolate[stopsToInterpolate.length - 1];
      for (let j = 0; j < stopsToInterpolate.length - 1; j++) {
        if (
          t >= (stopsToInterpolate[j].position ?? 0) &&
          t <= (stopsToInterpolate[j + 1].position ?? 1)
        ) {
          startStop = stopsToInterpolate[j];
          endStop = stopsToInterpolate[j + 1];
          break;
        }
      }

      // Normalize t within the segment
      const segmentLength = (endStop.position ?? 1) - (startStop.position ?? 0);
      const segmentT = segmentLength === 0
        ? 0
        : (t - (startStop.position ?? 0)) / segmentLength;

      const interpolatedColor = interpolateColor(
        startStop.color,
        endStop.color,
        segmentT,
        colorMode,
      );
      gradient.push(interpolatedColor);
    }

    // For perfect angular wrap in some renderers, the last step should equal the first.
    // gradient[gradient.length - 1] = gradient[0]; // Force wrap

    return gradient;
  }
}

/** Irregular/Blob Gradient Generator */
export class BlobGradient extends BaseGradient {
  private noise: SimplexNoise;
  protected getGradientType(): GradientType {
    return "blob";
  }

  constructor(options: GradientOptions) {
    super(options);
    // Initialize noise generator here, maybe with a seed from options
    this.noise = new SimplexNoise(Math.random()); // Use a random seed for now
  }

  protected generateSteps(): Palette {
    const steps = this.options.steps;
    const noiseFactor = this.options.noiseFactor ?? 0.2; // Default noise factor
    const colorMode = this.options.colorMode ?? "lch";
    const gradient: Palette = [];

    const time = Math.random() * 100; // Noise offset

    for (let i = 0; i < steps; i++) {
      let t = i / (steps - 1); // Base position [0, 1]

      // Apply noise to perturb t
      // Use 2D noise for smoother perturbation: noise(t, constant)
      const noiseVal = this.noise.noise2D(t * 5, time); // Scale t for noise frequency
      // Apply noise factor, center noise around 0: (noiseVal * noiseFactor)
      let perturbedT = t + (noiseVal * noiseFactor);
      perturbedT = Math.max(0, Math.min(1, perturbedT)); // Clamp perturbed t to [0, 1]

      // Find surrounding stops based on perturbed t
      let startStop = this.stops[0];
      let endStop = this.stops[this.stops.length - 1];
      for (let j = 0; j < this.stops.length - 1; j++) {
        if (
          perturbedT >= (this.stops[j].position ?? 0) &&
          perturbedT <= (this.stops[j + 1].position ?? 1)
        ) {
          startStop = this.stops[j];
          endStop = this.stops[j + 1];
          break;
        }
      }

      // Normalize perturbed t within the current segment
      const segmentLength = (endStop.position ?? 1) - (startStop.position ?? 0);
      const segmentT = segmentLength === 0
        ? 0
        : (perturbedT - (startStop.position ?? 0)) / segmentLength;

      const interpolatedColor = interpolateColor(
        startStop.color,
        endStop.color,
        segmentT,
        colorMode,
      );
      gradient.push(interpolatedColor);
    }
    return gradient;
  }
}

// --- High-Level API Function ---

/**
 * Generates a gradient of a specified type with the given options.
 * This is the main entry point for creating gradients.
 *
 * @param type - The type of gradient to generate ('linear', 'radial', 'angular', 'blob').
 * @param options - Configuration options for the gradient.
 * @returns A GradientOutput object containing the steps, metadata, CSS, and SVG.
 * @throws Error if the gradient type is unsupported.
 *
 * @example
 * const options: GradientOptions = {
 *   colors: ['#ff0000', '#0000ff'],
 *   steps: 10,
 *   colorMode: 'lab'
 * };
 * const linearGradient = generateGradient('linear', options);
 * console.log(linearGradient.css);
 *
 * const blobOptions: GradientOptions = {
 *   colors: [{color: 'lime', position: 0}, {color: 'magenta', position: 0.7}, {color: 'yellow', position: 1}],
 *   steps: 20,
 *   noiseFactor: 0.3
 * }
 * const blobGradient = generateGradient('blob', blobOptions);
 * console.log(blobGradient.gradient.map(c => c.hex));
 */
export function generateGradient(
  type: GradientType,
  options: GradientOptions,
): GradientOutput {
  let gradientGenerator: BaseGradient;

  switch (type) {
    case "linear":
      gradientGenerator = new LinearGradient(options);
      break;
    case "radial":
      gradientGenerator = new RadialGradient(options);
      break;
    case "angular":
      gradientGenerator = new AngularGradient(options);
      break;
    case "blob":
      gradientGenerator = new BlobGradient(options);
      break;
    default:
      // Exhaustiveness check (useful with TS)
      const exhaustiveCheck: never = type;
      throw new Error(`Unsupported gradient type: ${exhaustiveCheck}`);
  }

  return gradientGenerator.generate();
}
