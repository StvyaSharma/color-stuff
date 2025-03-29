/**
 * @file export/formats.ts
 * Functions for exporting colors or palettes into various common formats.
 */

import type { IColor, Palette } from "../core/color.types";

/**
 * Represents the output formats for a single color.
 */
export interface ColorExportFormats {
  hex: string; // #RRGGBB
  hexa: string; // #RRGGBBAA
  rgb: string; // rgb(r, g, b)
  rgba: string; // rgba(r, g, b, a)
  hsl: string; // hsl(h, s%, l%)
  hsla: string; // hsla(h, s%, l%, a)
  lab: string; // lab(l a b) -- CSS format
  lch: string; // lch(l c h) -- CSS format
  oklab: string; // oklab(l a b) -- CSS format
  oklch: string; // oklch(l c h) -- CSS format
  // Add more formats as needed: Android XML, iOS Swift/ObjC, JSON, etc.
}

/**
 * Exports a single color into multiple common string formats.
 *
 * @param color - The IColor object to export.
 * @returns An object containing string representations of the color in various formats.
 *
 * @example
 * const myColor = toIColor('rgba(255, 0, 0, 0.5)');
 * const formats = exportColorToFormats(myColor);
 * console.log(formats.hexa); // "#ff000080"
 * console.log(formats.rgba); // "rgba(255, 0, 0, 0.5)"
 * console.log(formats.hsl);  // "hsl(0, 100%, 50%)"
 */
export function exportColorToFormats(color: IColor): ColorExportFormats {
  const [r, g, b] = color.rgb;
  const [h, s, l_hsl] = color.hsl; // HSL values are h=0-360, s/l=0-100
  const [L_lab, a_lab, b_lab] = color.lab;
  const [L_ok, a_ok, b_ok] = color.oklab;
  // For LCH/OkLCH, need chroma and hue from Lab/OkLab
  const c_lch = Math.sqrt(a_lab ** 2 + b_lab ** 2);
  const h_lch = (Math.atan2(b_lab, a_lab) * 180 / Math.PI + 360) % 360;

  const c_oklch = Math.sqrt(a_ok ** 2 + b_ok ** 2);
  const h_oklch = (Math.atan2(b_ok, a_ok) * 180 / Math.PI + 360) % 360;

  const alpha = color.alpha.toFixed(2); // Format alpha
  const hexa = `${color.hex}${
    Math.round(color.alpha * 255).toString(16).padStart(2, "0")
  }`;

  return {
    hex: color.hex,
    hexa: hexa,
    rgb: `rgb(${r}, ${g}, ${b})`,
    rgba: `rgba(${r}, ${g}, ${b}, ${alpha})`,
    hsl: `hsl(${h.toFixed(0)}, ${s.toFixed(1)}%, ${l_hsl.toFixed(1)}%)`,
    hsla: `hsla(${h.toFixed(0)}, ${s.toFixed(1)}%, ${
      l_hsl.toFixed(1)
    }%, ${alpha})`,
    // CSS space-separated formats
    lab: `lab(${L_lab.toFixed(2)} ${a_lab.toFixed(2)} ${b_lab.toFixed(2)}${
      color.alpha < 1 ? ` / ${alpha}` : ""
    })`,
    lch: `lch(${L_lab.toFixed(2)} ${c_lch.toFixed(2)} ${h_lch.toFixed(2)}${
      color.alpha < 1 ? ` / ${alpha}` : ""
    })`,
    oklab: `oklab(${L_ok.toFixed(3)} ${a_ok.toFixed(3)} ${b_ok.toFixed(3)}${
      color.alpha < 1 ? ` / ${alpha}` : ""
    })`,
    oklch: `oklch(${L_ok.toFixed(3)} ${c_oklch.toFixed(3)} ${
      h_oklch.toFixed(2)
    }${color.alpha < 1 ? ` / ${alpha}` : ""})`,
  };
}

/**
 * Exports a palette into a structured format, often JSON or specific framework formats.
 * Example: Export as a JSON object with named colors or an array.
 *
 * @param palette - The Palette (array of IColor) to export.
 * @param format - The target format type (e.g., 'json', 'css-variables', 'tailwind').
 * @param options - Optional configuration for the specific format (e.g., names, prefix).
 * @returns The exported palette as a string or object, depending on the format.
 *
 * @example
 * const myPalette = [toIColor('red'), toIColor('blue')];
 * const jsonExport = exportPalette(myPalette, 'json', { names: ['primary', 'secondary'] });
 * // Output: { "primary": "#ff0000", "secondary": "#0000ff" }
 * const cssVars = exportPalette(myPalette, 'css-variables', { prefix: 'my-app' });
 * // Output: "--my-app-color-0: #ff0000;\n--my-app-color-1: #0000ff;"
 */
export function exportPalette(
  palette: Palette,
  format:
    | "json"
    | "css-variables"
    | "tailwind"
    | "scss-variables"
    | "js-object", // Add more as needed
  options: { names?: string[]; prefix?: string } = {},
): string | Record<string, string> | Record<string, any> {
  const { names = [], prefix = "color" } = options;

  switch (format) {
    case "json":
      const jsonObj: Record<string, string> = {};
      palette.forEach((color, index) => {
        const name = names[index] || `${prefix}-${index}`;
        jsonObj[name] = color.hex; // Exporting hex by default
      });
      return jsonObj;

    case "js-object":
      const jsObj: Record<string, string> = {};
      palette.forEach((color, index) => {
        const name = names[index] || `${prefix}${index}`; // JS friendly names
        jsObj[name] = color.hex;
      });
      return jsObj; // Returning object, consumer can stringify if needed

    case "css-variables":
      return palette.map((color, index) => {
        const name = names[index] || `${prefix}-${index}`;
        // Use RGBA values for CSS vars to include alpha easily
        const [r, g, b] = color.rgb;
        const cssValue = `${r} ${g} ${b}${
          color.alpha < 1 ? ` / ${color.alpha.toFixed(2)}` : ""
        }`;
        // return `--${name}: ${color.hex};`; // Simpler hex export
        return `--${name}: ${cssValue}; /* ${color.hex} */`; // Export as components
      }).join("\n");

    case "scss-variables":
      return palette.map((color, index) => {
        const name = names[index] || `${prefix}-${index}`;
        return `$${name}: ${color.hex};`;
      }).join("\n");

    case "tailwind":
      // Tailwind config typically uses a nested object structure
      const tailwindConfig: Record<string, string> = {};
      palette.forEach((color, index) => {
        const name = names[index] || `${index}`; // Just use index or provided name
        tailwindConfig[name] = color.hex;
      });
      // Return structure ready to be merged into tailwind.config.js theme.extend.colors
      return { [prefix]: tailwindConfig }; // e.g., { color: { '0': '#...', 'primary': '#...' } }

    default:
      console.warn(`Unsupported export format: ${format}. Returning JSON.`);
      const fallbackJson: Record<string, string> = {};
      palette.forEach((color, index) => {
        const name = names[index] || `${prefix}-${index}`;
        fallbackJson[name] = color.hex;
      });
      return fallbackJson;
  }
}
