/**
 * @file gradients/rendering.ts
 * Functions to render generated gradient steps into CSS or SVG formats.
 */

import type { IColor } from "../core/color.types";
import type { GradientOptions, GradientType } from "./gradient.types";

/**
 * Creates a CSS gradient string from a list of color steps.
 *
 * @param type - The type of gradient ('linear', 'radial', 'angular', 'blob').
 * @param colors - An array of IColor objects representing the gradient steps.
 * @param options - Optional GradientOptions providing context like angle or focal point.
 * @returns A CSS gradient string (e.g., "linear-gradient(...)"). Returns a simple background for 'blob'.
 *
 * @example
 * const steps = [toIColor('red'), toIColor('yellow'), toIColor('lime')];
 * const cssLinear = renderCssGradient('linear', steps, { angle: 90 });
 * // "linear-gradient(90deg, #ff0000, #ffff00, #00ff00)"
 * const cssRadial = renderCssGradient('radial', steps, { focalPoint: [0.2, 0.8] });
 * // "radial-gradient(circle at 20% 80%, #ff0000, #ffff00, #00ff00)"
 */
export function renderCssGradient(
  type: GradientType,
  colors: IColor[],
  options?: Pick<GradientOptions, "angle" | "focalPoint" | "radialShape">,
): string {
  const colorStops = colors.map((c) => c.hex).join(", "); // Basic equidistant stops

  switch (type) {
    case "linear":
      // Default angle: 180deg (top to bottom) if not specified
      const angle = options?.angle ?? 180;
      return `linear-gradient(${angle}deg, ${colorStops})`;

    case "radial":
      const shape = options?.radialShape ?? "ellipse"; // Default to ellipse
      const focal = options?.focalPoint ?? [0.5, 0.5]; // Default center
      const position = `at ${focal[0] * 100}% ${focal[1] * 100}%`;
      return `radial-gradient(${shape} ${position}, ${colorStops})`;

    case "angular": // Also known as conic
      // Default start angle: 0deg if not specified
      const fromAngle = options?.angle ?? 0;
      return `conic-gradient(from ${fromAngle}deg, ${colorStops})`;

    case "blob":
      // CSS doesn't have a standard 'blob' gradient. Return a placeholder or base color.
      // Could also return multiple radial gradients layered, but that's complex.
      console.warn(
        "CSS rendering for 'blob' gradient is not directly supported. Returning first color as background.",
      );
      return `background-color: ${
        colors[0]?.hex || "#000000"
      }; /* Blob gradient requires canvas/SVG */`;

    default:
      console.error(`Unsupported gradient type for CSS rendering: ${type}`);
      return `background-color: ${
        colors[0]?.hex || "#000000"
      }; /* Error: Unknown type */`;
  }
}

/**
 * Renders gradient output as SVG gradient definitions (for linear and radial).
 *
 * @param type - Gradient type ('linear' or 'radial').
 * @param colors - Array of IColor steps.
 * @param gradientId - The ID to assign to the generated SVG gradient element. Defaults to 'gradient'.
 * @param options - Optional settings like angle for linear gradients.
 * @returns A string containing the SVG <linearGradient> or <radialGradient> definition.
 * @throws Error if type is not 'linear' or 'radial'.
 *
 * @example
 * const steps = [toIColor('blue'), toIColor('cyan')];
 * const svgLinear = renderSvgGradient('linear', steps, 'myLinearGradient');
 * // Returns SVG <linearGradient id="myLinearGradient">...</linearGradient>
 * const svgRadial = renderSvgGradient('radial', steps, 'myRadialGradient');
 */
export function renderSvgGradient(
  type: "linear" | "radial",
  colors: IColor[],
  gradientId: string = "gradient",
  options?: Pick<GradientOptions, "angle" | "focalPoint" | "radialShape">, // Add options if needed
): string {
  if (type !== "linear" && type !== "radial") {
    throw new Error(
      "SVG rendering is currently supported only for linear and radial gradients.",
    );
  }
  if (colors.length < 2) {
    console.warn("Cannot generate SVG gradient with fewer than 2 colors.");
    return ""; // Return empty string or throw error
  }

  const stops = colors
    .map((color, i) => {
      // Calculate offset percentage for equidistant stops
      const offset = ((i / (colors.length - 1)) * 100).toFixed(2);
      // Include alpha if present and less than 1
      const stopOpacity = color.alpha < 1
        ? ` stop-opacity="${color.alpha.toFixed(2)}"`
        : "";
      return `    <stop offset="${offset}%" stop-color="${color.hex}"${stopOpacity} />`;
    })
    .join("\n");

  if (type === "linear") {
    // Basic horizontal gradient, can be customized with x1, y1, x2, y2, gradientTransform
    // Example: Use angle to set gradientTransform
    let transform = "";
    if (options?.angle !== undefined && options.angle !== 0) {
      // SVG rotation is clockwise, CSS angle is counter-clockwise from positive Y axis (usually)
      // A simple mapping might be just using the angle, but precise CSS mapping is complex.
      // transform = `gradientTransform="rotate(${options.angle})"`; // Simple rotation around center
    }
    // Default: left to right
    return `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%" ${transform}>\n${stops}\n</linearGradient>`;
  } else { // Radial
    const focal = options?.focalPoint ?? [0.5, 0.5];
    const shape = options?.radialShape ?? "ellipse"; // Not directly supported by SVG fx/fy/cx/cy/r
    // SVG radial gradients use cx, cy, r for circle, and cx, cy, fx, fy, r for ellipse with focal point
    const cx = 0.5; // Center X
    const cy = 0.5; // Center Y
    const r = 0.5; // Radius (50%)
    const fx = focal[0];
    const fy = focal[1];

    return `<radialGradient id="${gradientId}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">\n${stops}\n</radialGradient>`;
  }
}
