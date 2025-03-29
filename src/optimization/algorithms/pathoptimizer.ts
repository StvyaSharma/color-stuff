/**
 * @file optimization/algorithms/pathoptimizer.ts
 * Finds an optimal ordering (path) for a given set of colors to maximize
 * perceptual uniformity (consistent DeltaE steps) between adjacent colors in the sequence.
 * Uses a simple randomized optimization approach (similar to a basic genetic algorithm/hill climbing).
 */
import chroma from "chroma-js";
import type {
  ColorEdge,
  ColorGraph,
  PathOptimizerOptions,
} from "../optimization.types.ts";
import { randomInt } from "../../utils/math.ts";
import { shuffleArray } from "../../utils/array.ts"; // Assuming shuffleArray exists in utils

/**
 * Builds a complete graph where nodes are colors and edges represent
 * the perceptual distance (CIEDE2000) between them.
 * @param colors - Array of color strings (hex, rgb, named).
 * @returns The color graph.
 * @private
 */
function buildColorGraph(colors: string[]): ColorGraph {
  const graph: ColorGraph = {};
  const uniqueColors = Array.from(new Set(colors)); // Ensure unique colors

  if (uniqueColors.length < 2) {
    console.warn("Cannot build graph with fewer than 2 unique colors.");
    // Return graph with single node if only one color?
    if (uniqueColors.length === 1) graph[uniqueColors[0]] = [];
    return graph;
  }

  uniqueColors.forEach((sourceColor) => {
    graph[sourceColor] = [];
    uniqueColors.forEach((targetColor) => {
      if (sourceColor !== targetColor) {
        try {
          const distance = chroma.deltaE(sourceColor, targetColor);
          graph[sourceColor].push({
            color: targetColor,
            distance: distance,
          });
        } catch (e) {
          console.error(
            `Could not calculate distance between ${sourceColor} and ${targetColor}`,
            e,
          );
          // Optionally add edge with Infinity distance or skip
        }
      }
    });
  });
  return graph;
}

/**
 * Calculates the fitness of a color path (sequence).
 * Fitness aims for low standard deviation of distances between consecutive colors
 * and optionally rewards higher average distance (contrast). Lower fitness score is better.
 * @param path - Ordered array of color strings.
 * @param graph - The pre-calculated color graph.
 * @returns Fitness score (lower is better). Returns Infinity for invalid paths.
 * @private
 */
function calculatePathFitness(path: string[], graph: ColorGraph): number {
  if (path.length < 2) {
    return 0; // Or Infinity? A path of 0 or 1 has no steps. Let's return 0.
  }

  const distances: number[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const current = path[i];
    const next = path[i + 1];

    // Find the edge distance in the graph
    const edge = graph[current]?.find((e) => e.color === next);
    if (!edge || !isFinite(edge.distance)) {
      console.warn(
        `Invalid step in path: ${current} -> ${next}. Edge not found or invalid distance.`,
      );
      return Infinity; // Invalid path if an edge is missing
    }
    distances.push(edge.distance);
  }

  if (distances.length === 0) return 0; // Only one color in path

  // Calculate mean and standard deviation of path distances
  const sum = distances.reduce((acc, val) => acc + val, 0);
  const mean = sum / distances.length;

  if (mean === 0) return Infinity; // Avoid division by zero if all distances are 0 (identical colors?)

  const variance =
    distances.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    distances.length;
  const standardDeviation = Math.sqrt(variance);

  // Fitness = Standard Deviation / Mean (Coefficient of Variation)
  // Lower is better: more consistent steps relative to the average step size.
  // Penalize low mean distance (low contrast overall) slightly?
  // Example penalty: Add term like + (1 / mean) * weight
  const contrastPenaltyWeight = 0.1;
  const fitness = (standardDeviation / mean) + (contrastPenaltyWeight / mean);

  return fitness;
}

/**
 * Generates an initial random path, keeping the first color fixed.
 * @param colors - Array of color strings.
 * @returns A randomly ordered path starting with the first color.
 * @private
 */
function generateInitialPath(colors: string[]): string[] {
  if (colors.length < 2) return colors;
  const firstColor = colors[0];
  const remaining = colors.slice(1);
  const shuffledRemaining = shuffleArray(remaining); // Use utility shuffle
  return [firstColor, ...shuffledRemaining];
}

/**
 * Creates a mutation of a path by swapping two random colors (excluding the first).
 * @param path - The original path.
 * @returns A new path with a single swap mutation.
 * @private
 */
function mutatePath(path: string[]): string[] {
  if (path.length < 3) return path; // Need at least 3 colors to swap the non-first ones
  const newPath = [...path];
  const index1 = randomInt(1, path.length - 1); // Index from second element onwards
  let index2 = randomInt(1, path.length - 1);
  while (index1 === index2) { // Ensure different indices
    index2 = randomInt(1, path.length - 1);
  }
  // Swap elements at index1 and index2
  [newPath[index1], newPath[index2]] = [newPath[index2], newPath[index1]];
  return newPath;
}

/**
 * Finds an optimized path (ordering) for a list of colors using a simple
 * randomized iterative improvement algorithm (similar to basic Hill Climbing or GA).
 * It seeks an order where the perceptual distance between consecutive colors is consistent.
 *
 * @param options - Configuration options including the list of `colors` and `iterations`.
 * @returns Object containing the best path found and its fitness score (lower is better).
 * @throws Error if fewer than 2 colors are provided.
 *
 * @example
 * const pathOptions: PathOptimizerOptions = {
 *   colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff"],
 *   iterations: 50000
 * };
 * const result = findOptimalColorPath(pathOptions);
 * console.log("Optimized Color Path:", result.path);
 * console.log("Path Fitness (lower is better):", result.fitness);
 */
export function findOptimalColorPath(options: PathOptimizerOptions): {
  path: string[];
  fitness: number;
} {
  const { colors, iterations = 10000 } = options;

  if (!colors || colors.length < 2) {
    throw new Error("Color path optimization requires at least 2 colors.");
  }

  // Build the graph of distances between colors
  const graph = buildColorGraph(colors);
  if (Object.keys(graph).length < 2) {
    console.warn(
      "Graph building failed or resulted in < 2 nodes. Returning initial order.",
    );
    return { path: colors, fitness: Infinity };
  }

  // Generate initial random solution path
  let bestPath = generateInitialPath(colors);
  let bestFitness = calculatePathFitness(bestPath, graph);

  if (!isFinite(bestFitness)) {
    console.warn(
      "Initial path has invalid fitness. Check color inputs or distance calculations.",
    );
    // Potentially try another random start path? Or return error state.
    return { path: bestPath, fitness: Infinity };
  }

  // Optimization loop
  for (let i = 0; i < iterations; i++) {
    // Create a mutation of the current best path
    const newPath = mutatePath(bestPath);
    const newFitness = calculatePathFitness(newPath, graph);

    // If the mutated path is better (lower fitness), keep it
    if (isFinite(newFitness) && newFitness < bestFitness) {
      bestPath = newPath;
      bestFitness = newFitness;
    }
  }

  return { path: bestPath, fitness: bestFitness };
}
