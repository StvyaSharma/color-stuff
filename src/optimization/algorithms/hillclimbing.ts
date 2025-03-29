/**
 * @file optimization/algorithms/hillclimbing.ts
 * Implements the Hill Climbing optimization algorithm for color palettes.
 */
import type chroma from "chroma-js";
import type { IColor, Palette } from "../../core/color.types.ts";
import { type fromIColor, toIColor } from "../../core/conversions.ts";
import { clamp } from "../../utils/math.ts";
import { evaluatePaletteSolution } from "../fitness.ts";
import type { HillClimbingOptions, Move } from "../optimization.types.ts";

/**
 * Generates neighboring palettes by slightly modifying one color channel
 * of the current palette. Considers RGB channels.
 * @param palette - The current palette.
 * @param step - The amount to change a channel by (+/-).
 * @returns An array of possible moves.
 * @private
 */
function computeNeighbourMoves(palette: Palette, step: number): Move[] {
  const moves: Move[] = [];
  palette.forEach((color, index) => {
    const [r, g, b] = color.rgb;
    // Moves for Red channel
    if (r < 255) {
      moves.push({ paletteIndex: index, channel: "r", change: step });
    }
    if (r > 0) moves.push({ paletteIndex: index, channel: "r", change: -step });
    // Moves for Green channel
    if (g < 255) {
      moves.push({ paletteIndex: index, channel: "g", change: step });
    }
    if (g > 0) moves.push({ paletteIndex: index, channel: "g", change: -step });
    // Moves for Blue channel
    if (b < 255) {
      moves.push({ paletteIndex: index, channel: "b", change: step });
    }
    if (b > 0) moves.push({ paletteIndex: index, channel: "b", change: -step });
  });
  // Filter out moves that result in no actual change due to clamping boundaries implicitly handled later
  // Or filter here if step is large? No, applyMove handles clamping.
  return moves;
}

/**
 * Applies a move to a palette, returning a new palette.
 * @param palette - The original palette.
 * @param move - The move to apply.
 * @returns A new palette with the move applied.
 * @private
 */
function applyMove(palette: Palette, move: Move): Palette {
  // Create a deep copy to avoid modifying the original
  const newPalette = palette.map((c) => ({ ...c }));
  const colorToModify = newPalette[move.paletteIndex];
  let [r, g, b] = colorToModify.rgb;

  switch (move.channel) {
    case "r":
      r = clamp(r + move.change, 0, 255);
      break;
    case "g":
      g = clamp(g + move.change, 0, 255);
      break;
    case "b":
      b = clamp(b + move.change, 0, 255);
      break;
      // Add cases for h, s, l if moves are defined for them
  }

  // Update the color in the new palette using toIColor to recalculate all formats
  newPalette[move.paletteIndex] = toIColor([r, g, b]); // Assumes alpha = 1 or handles default
  return newPalette;
}

/**
 * Optimizes a color palette using the basic Hill Climbing algorithm.
 * It iteratively moves to the best neighboring palette until a local optimum
 * (where no neighbor is better) is reached.
 *
 * Assumes the standard 5-color palette structure for the fitness function.
 *
 * @param options - Configuration options for Hill Climbing.
 * @returns Object containing the optimized palette, its fitness, iteration count, and fitness history.
 * @throws Error if the initial palette is not valid (e.g., not 5 colors).
 *
 * @example
 * const hcOptions: HillClimbingOptions = {
 *   primaryColor: toIColor('purple'),
 *   initialSolution: createRandomPalette(5), // Needs a function to create initial palette
 *   maxIterations: 1000,
 *   patience: 50,
 *   neighbourStep: 5 // Smaller step for finer tuning
 * };
 * const result = hillClimbingOptimization(hcOptions);
 * console.log("Best Hill Climbing Palette:", result.solution.map(c => c.hex));
 * console.log("Best Fitness:", result.fitness);
 */
export function hillClimbingOptimization(options: HillClimbingOptions): {
  solution: Palette;
  fitness: number;
  iterations: number;
  fitnessHistory: number[];
} {
  const {
    primaryColor,
    initialSolution,
    maxIterations = 1000,
    patience = 50,
    neighbourStep = 10,
  } = options;

  // Validate initial solution immediately
  if (!initialSolution || initialSolution.length !== 5) {
    throw new Error(
      "Hill Climbing requires an initial palette of 5 IColor objects.",
    );
  }

  let currentSolution: Palette = initialSolution.map((c: IColor) => ({ ...c })); // Start with a deep copy
  let currentFitness = evaluatePaletteSolution(primaryColor, currentSolution);

  if (!isFinite(currentFitness)) {
    console.warn(
      "Initial solution provided to Hill Climbing has invalid fitness. Aborting.",
    );
    // Return the initial solution or throw error? Let's return initial.
    return {
      solution: initialSolution,
      fitness: -Infinity,
      iterations: 0,
      fitnessHistory: [-Infinity],
    };
  }

  let iterationsWithoutImprovement = 0;
  const fitnessHistory: number[] = [currentFitness]; // Use const as it's only modified, not reassigned
  let iteration = 0;

  for (; iteration < maxIterations; iteration++) {
    const neighbourMoves = computeNeighbourMoves(
      currentSolution,
      neighbourStep,
    );
    let bestNeighbourSolution: Palette | null = null;
    let bestNeighbourFitness = currentFitness; // Start assuming current is best

    let foundBetterNeighbour = false;
    for (const move of neighbourMoves) {
      const neighbourSolution = applyMove(currentSolution, move);
      const neighbourFitness = evaluatePaletteSolution(
        primaryColor,
        neighbourSolution,
      );

      if (
        isFinite(neighbourFitness) && neighbourFitness > bestNeighbourFitness
      ) {
        bestNeighbourFitness = neighbourFitness;
        bestNeighbourSolution = neighbourSolution;
        foundBetterNeighbour = true;
      }
    }

    // If a strictly better neighbour was found, move to it
    if (foundBetterNeighbour && bestNeighbourSolution) {
      currentSolution = bestNeighbourSolution; // Move to the best neighbour found
      currentFitness = bestNeighbourFitness;
      fitnessHistory.push(currentFitness);
      iterationsWithoutImprovement = 0; // Reset patience
    } else {
      // No improvement found in this iteration
      iterationsWithoutImprovement++;
      fitnessHistory.push(currentFitness); // Log the same fitness
      if (iterationsWithoutImprovement >= patience) {
        // console.log(`Hill climbing stopping after ${patience} iterations without improvement.`);
        break; // Stop due to patience limit
      }
    }
  } // End of iteration loop

  return {
    solution: currentSolution, // The best solution found (local optimum)
    fitness: currentFitness,
    iterations: iteration,
    fitnessHistory,
  };
}
