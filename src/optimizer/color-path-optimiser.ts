// @ts-nocheck
import chroma from "chroma-js";

/**
 * Represents a connection (edge) between two colors in the graph.
 * Each edge contains the destination color and the perceptual distance to it.
 *
 * @example
 * const edge: ColorEdge = {
 *   color: "#FF0000",  // Destination color (red)
 *   distance: 23.4     // Perceptual distance to the destination color
 * };
 */
interface ColorEdge {
  /** The destination color in the edge (hex, rgb, or named color) */
  color: string;
  /** The perceptual distance between the source and destination colors */
  distance: number;
}

/**
 * Represents the complete graph structure where each color is connected to all other colors.
 * The keys are color strings and the values are arrays of edges to other colors.
 *
 * @example
 * const graph: ColorGraph = {
 *   "#FF0000": [  // Red color connections
 *     { color: "#00FF00", distance: 45.6 },  // Connection to green
 *     { color: "#0000FF", distance: 32.1 }   // Connection to blue
 *   ],
 *   // ... connections for other colors
 * };
 */
export type ColorGraph = Record<string, ColorEdge[]>;

/**
 * Builds a complete graph of colors where each color is connected to every other color.
 * The edge weights represent the perceptual distance between colors using the CIEDE2000 color difference formula.
 *
 * @param colors - Array of color strings (hex codes, rgb values, or named colors)
 * @returns A complete graph where each color is connected to all others
 *
 * @example
 * const colors = ["#FF0000", "#00FF00", "#0000FF"];
 * const graph = buildColorGraph(colors);
 * // Returns a graph where red is connected to green and blue,
 * // green is connected to red and blue, etc.
 */
function buildColorGraph(colors: string[]): ColorGraph {
  // Initialize empty graph structure
  const graph: ColorGraph = {};

  // Create edges between each pair of colors
  colors.forEach((sourceColor) => {
    graph[sourceColor] = [];
    colors.forEach((targetColor) => {
      // Don't create edges from a color to itself
      if (sourceColor !== targetColor) {
        // Calculate perceptual distance using CIEDE2000 formula
        graph[sourceColor].push({
          color: targetColor,
          distance: chroma.deltaE(sourceColor, targetColor),
        });
      }
    });
  });

  return graph;
}

/**
 * Calculates statistical measures (mean and standard deviation) for all edge weights in the graph.
 * These statistics help evaluate the overall distribution of color differences.
 *
 * @param graph - The color graph to analyze
 * @returns Object containing mean and standard deviation of all distances
 *
 * @example
 * const stats = calculateGraphStatistics(graph);
 * console.log(`Average distance: ${stats.mean}`);
 * console.log(`Standard deviation: ${stats.standardDeviation}`);
 */
function calculateGraphStatistics(graph: ColorGraph): {
  mean: number;
  standardDeviation: number;
} {
  // Extract all edge distances into a single array
  const distances: number[] = [];
  Object.values(graph).forEach((edges) => {
    edges.forEach((edge) => {
      distances.push(edge.distance);
    });
  });

  // Calculate mean
  const mean = distances.reduce((sum, val) => sum + val) / distances.length;

  // Calculate standard deviation
  const squaredDiffs = distances.map((x) => Math.pow(x - mean, 2));
  const variance =
    squaredDiffs.reduce((sum, val) => sum + val) / distances.length;
  const standardDeviation = Math.sqrt(variance);

  return { mean, standardDeviation };
}

/**
 * Calculates the fitness of a specific color path through the graph.
 * A good path has consistent distances between consecutive colors (low standard deviation)
 * while maintaining sufficient contrast between adjacent colors (high mean).
 *
 * Lower fitness values indicate better paths.
 *
 * @param path - Ordered array of colors representing the path
 * @param graph - The color graph containing distance information
 * @returns Fitness value (lower is better)
 *
 * @example
 * const path = ["#FF0000", "#00FF00", "#0000FF"];
 * const fitness = calculatePathFitness(path, graph);
 * // Returns a value indicating how good this color sequence is
 */
function calculatePathFitness(path: string[], graph: ColorGraph): number {
  // Calculate distances between consecutive colors in the path
  const distances: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const currentColor = path[i];
    const nextColor = path[i + 1];

    // Find the edge connecting these colors
    const edge = graph[currentColor].find((e) => e.color === nextColor)!;
    distances.push(edge.distance);
  }

  // Calculate mean and standard deviation of path distances
  const pathMean = distances.reduce((sum, val) => sum + val) / distances.length;
  const squaredDiffs = distances.map((x) => Math.pow(x - pathMean, 2));
  const pathVariance =
    squaredDiffs.reduce((sum, val) => sum + val) / distances.length;
  const pathStandardDeviation = Math.sqrt(pathVariance);

  // Return fitness score - lower values are better
  // We want low standard deviation (consistency) and high mean (contrast)
  return pathStandardDeviation / pathMean;
}

/**
 * Generates a random path through all colors, keeping the first color fixed.
 * This is used to create initial solutions for the optimization algorithm.
 *
 * @param colors - Array of colors to create a path through
 * @returns Array representing a random path through the colors
 *
 * @example
 * const colors = ["#FF0000", "#00FF00", "#0000FF"];
 * const randomPath = generateRandomPath(colors);
 * // Might return ["#FF0000", "#0000FF", "#00FF00"]
 */
function generateRandomPath(colors: string[]): string[] {
  // Keep first color fixed
  const path = [colors[0]];

  // Randomly shuffle remaining colors
  const remainingColors = colors.slice(1);
  while (remainingColors.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingColors.length);
    const randomColor = remainingColors.splice(randomIndex, 1)[0];
    path.push(randomColor);
  }

  return path;
}

/**
 * Creates a mutation of a given path by swapping two random colors,
 * while keeping the first color fixed. This helps explore new possible solutions.
 *
 * @param path - The original path to mutate
 * @returns A new path with two random colors swapped
 *
 * @example
 * const path = ["#FF0000", "#00FF00", "#0000FF"];
 * const mutatedPath = mutatePath(path);
 * // Might return ["#FF0000", "#0000FF", "#00FF00"]
 */
function mutatePath(path: string[]): string[] {
  const newPath = [...path];

  // Select two random indices (excluding the first color)
  const index1 = Math.floor(Math.random() * (newPath.length - 1)) + 1;
  const index2 = Math.floor(Math.random() * (newPath.length - 1)) + 1;

  // Swap the colors at these indices
  [newPath[index1], newPath[index2]] = [newPath[index2], newPath[index1]];

  return newPath;
}

/**
 * Compares two paths and returns the one with better fitness (lower score).
 * Used in the optimization process to keep the best solution found so far.
 *
 * @param pathA - First path to compare
 * @param pathB - Second path to compare
 * @param graph - The color graph containing distance information
 * @returns The path with better fitness
 *
 * @example
 * const bestPath = selectBestPath(currentPath, newPath, graph);
 */
function selectBestPath(
  pathA: string[],
  pathB: string[],
  graph: ColorGraph,
): string[] {
  const fitnessA = calculatePathFitness(pathA, graph);
  const fitnessB = calculatePathFitness(pathB, graph);
  return fitnessA < fitnessB ? pathA : pathB;
}

/**
 * Main optimization function that uses a genetic algorithm approach to find
 * an optimal path through the colors. The algorithm iteratively generates
 * mutations of the current best path and keeps improvements.
 *
 * @param colors - Array of colors to optimize
 * @param iterations - Number of optimization iterations to perform
 * @returns Object containing the best path found and its fitness score
 *
 * @example
 * const colors = ["#FF0000", "#00FF00", "#0000FF", "#FFFF00"];
 * const result = findOptimalColorPath(colors, 50000);
 * console.log("Best path:", result.path);
 * console.log("Path fitness:", result.fitness);
 */
function findOptimalColorPath(
  colors: string[],
  iterations: number = 100000,
): { path: string[]; fitness: number } {
  // Build the initial color graph
  const graph = buildColorGraph(colors);

  // Generate initial random solution
  let bestPath = generateRandomPath(colors);
  let bestFitness = calculatePathFitness(bestPath, graph);

  console.log("Starting optimization:");
  console.log("Initial fitness:", bestFitness);

  // Main optimization loop
  for (let i = 0; i < iterations; i++) {
    // Generate and test a mutation
    const newPath = mutatePath(bestPath);
    const newFitness = calculatePathFitness(newPath, graph);

    // Keep the better solution
    if (newFitness < bestFitness) {
      bestPath = newPath;
      bestFitness = newFitness;
    }
  }

  console.log("Optimization complete:");
  console.log("Final fitness:", bestFitness);

  return { path: bestPath, fitness: bestFitness };
}

/**
 * Generates a random hex color.
 * @returns A random hex color string in the format "#RRGGBB"
 */
function generateRandomHexColor(): string {
  const hex = Math.floor(Math.random() * 16777215).toString(16);
  return "#" + hex.padStart(6, "0");
}

export { findOptimalColorPath };
