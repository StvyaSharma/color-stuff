/**
 * @file deviceManager.ts
 * Device-independent color management: color space conversions,
 * device profile normalization, multi-format export, color appearance modeling.
 */

import type { IColor } from "../core/color-operations.ts";

/**
 * Device profile interface
 */
export interface IDeviceProfile {
  name: string;
  gamma: number;
  whitePoint: [number, number, number];
}

/**
 * Export color to multiple format strings: CSS, SASS, Tailwind, Figma, Sketch, etc.
 *
 * @param color - IColor
 * @returns Object containing all format strings
 */
export function exportColorFormats(color: IColor): Record<string, string> {
  const { hex, rgb } = color;
  const [r, g, b] = rgb;
  return {
    css: `color: ${hex};`,
    sass: `$color: ${hex};`,
    tailwind: `bg-[${hex}]`,
    figma: `${hex}`, // Figma typically uses HEX
    sketch: `${hex}`, // Sketch typically uses HEX
    rgbString: `rgb(${r}, ${g}, ${b})`,
  };
}
