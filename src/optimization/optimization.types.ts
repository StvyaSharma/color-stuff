/**
 * @file optimization/optimization.types.ts
 * Defines common types used across different optimization algorithms.
 */
import type { IColor, Palette } from "../core/color.types";

/**
 * Function signature for evaluating the fitness of a palette.
 * Higher values are typically better. Should handle invalid palettes gracefully.
 * @param primaryColor - A reference color, often used for context.
 * @param palette - The palette solution to evaluate.
 * @returns A numerical fitness score. Returns -Infinity or NaN for invalid solutions.
 */
export type FitnessFunction = (
  primaryColor: IColor,
  palette: Palette,
) => number;

/** Represents an individual solution within a population-based algorithm (like Genetic Algorithm). */
export interface Individual<T> {
  /** The solution itself (e.g., a Palette). */
  solution: T;
  /** The fitness score of the solution. */
  fitness: number;
}

/** Represents a potential change or move in a search-based algorithm (like Hill Climbing, SA). */
export interface Move {
  /** Index of the color within the palette to modify. */
  paletteIndex: number;
  /** The color channel to change ('r', 'g', 'b', or potentially 'h', 's', 'l'). */
  channel: "r" | "g" | "b" | "h" | "s" | "l";
  /** The amount of change to apply (+/-). */
  change: number;
}

/** Represents an edge in the color path optimization graph. */
export interface ColorEdge {
  /** The destination color (hex string). */
  color: string;
  /** The perceptual distance (e.g., DeltaE 2000) to the destination color. */
  distance: number;
}

/** Represents the graph structure for color path optimization. */
export type ColorGraph = Record<string, ColorEdge[]>;

/** Common configuration options for optimization algorithms. */
export interface OptimizationOptions {
  /** The primary/reference color for fitness evaluation. */
  primaryColor: IColor;
  /** The initial palette or population to start optimization from. */
  initialSolution: Palette | Palette[]; // Palette for single-solution, Palette[] for population
  /** Maximum number of iterations or generations. */
  maxIterations: number;
}

/** Options specific to Hill Climbing. */
export interface HillClimbingOptions extends OptimizationOptions {
  initialSolution: Palette; // Requires a single starting palette
  /** Number of iterations without improvement before stopping. */
  patience?: number;
  /** The +/- change applied to find neighbours. */
  neighbourStep?: number;
}

/** Options specific to Simulated Annealing. */
export interface SimulatedAnnealingOptions extends OptimizationOptions {
  initialSolution: Palette; // Requires a single starting palette
  /** Starting temperature. */
  initialTemperature?: number;
  /** Temperature cooling rate (e.g., 0.99). */
  coolingRate?: number;
  /** Temperature threshold to stop. */
  minTemperature?: number;
  /** The +/- change applied to find neighbours. */
  neighbourStep?: number;
}

/** Options specific to Genetic Algorithms. */
export interface GeneticAlgorithmOptions extends OptimizationOptions {
  initialSolution: Palette[]; // Requires an initial population
  /** Probability of crossover (0-100). */
  crossoverProbability?: number;
  /** Probability of mutation per gene/color (0-100). */
  mutationProbability?: number;
  /** Max +/- change for small mutations. */
  mutationAmount?: number;
  /** Fitness threshold to stop early. */
  thresholdFitness?: number;
  /** Crossover method. */
  crossoverOperation?: CrossoverOperation;
  /** Selection method (optional, defaults might be used). */
  selectionMethod?: "roulette" | "tournament" | "rank"; // Example selection types
  /** Elitism: number of best individuals to carry over directly. */
  elitismCount?: number;
}

/** Crossover operation types for Genetic Algorithms. */
export type CrossoverOperation =
  | "one-point"
  | "two-point"
  | "block"
  | "uniform"
  | "shuffle";

/** Options specific to single color evolution. */
export interface EvolveSingleColorOptions {
  targetColor: IColor;
  populationSize?: number;
  generations?: number;
  mutationRate?: number; // Probability 0-1
  mutationAmount?: number; // Max +/- change
}

/** Options specific to Color Path Optimization. */
export interface PathOptimizerOptions {
  colors: string[]; // Input colors as strings (hex, named, etc.)
  iterations?: number;
}
