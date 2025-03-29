/**
 * @file optimization/algorithms/simulatedannealing.ts
 * Implements the Simulated Annealing optimization algorithm for color palettes.
 */
import type chroma from "chroma-js";
import type { IColor, Palette } from "../../core/color.types.ts";
import { type fromIColor, toIColor } from "../../core/conversions.ts";
import { clamp } from "../../utils/math.ts";
import { evaluatePaletteSolution } from "../fitness.ts";
import type { Move, SimulatedAnnealingOptions } from "../optimization.types.ts";

/**
 * Generates possible neighboring moves by slightly modifying one color channel
 * of the current palette. Considers RGB channels.
 * @param palette - The current palette.
 * @param step - The amount to change a channel by (+/-).
 * @returns An array of possible moves.
 * @private
 */
function computeNeighbourMovesSA(palette: Palette, step: number): Move[] {
  const moves: Move[] = [];
  palette.forEach((color, index) => {
    const [r, g, b] = color.rgb;
    if (r < 255) {
      moves.push({ paletteIndex: index, channel: "r", change: step });
    }
    if (r > 0) moves.push({ paletteIndex: index, channel: "r", change: -step });
    if (g < 255) {
      moves.push({ paletteIndex: index, channel: "g", change: step });
    }
    if (g > 0) moves.push({ paletteIndex: index, channel: "g", change: -step });
    if (b < 255) {
      moves.push({ paletteIndex: index, channel: "b", change: step });
    }
    if (b > 0) moves.push({ paletteIndex: index, channel: "b", change: -step });
  });
  return moves;
}

/**
 * Applies a move to a palette, returning a new palette.
 * @param palette - The original palette.
 * @param move - The move to apply.
 * @returns A new palette with the move applied.
 * @private
 */
function applyMoveSA(palette: Palette, move: Move): Palette {
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
  }
  newPalette[move.paletteIndex] = toIColor([r, g, b]);
  return newPalette;
}

/**
 * Optimizes a color palette using Simulated Annealing.
 * This algorithm can escape local optima by accepting worse solutions with a probability
 * that decreases over time (as temperature cools).
 *
 * Assumes the standard 5-color palette structure for the fitness function.
 *
 * @param options - Configuration options for Simulated Annealing.
 * @returns Object containing the best solution found, its fitness, iteration count, fitness history, and temperature history.
 * @throws Error if the initial palette is not valid (e.g., not 5 colors).
 *
 * @example
 * const saOptions: SimulatedAnnealingOptions = {
 *   primaryColor: toIColor('green'),
 *   initialSolution: createRandomPalette(5), // Needs an initial palette function
 *   maxIterations: 5000,
 *   initialTemperature: 100,
 *   coolingRate: 0.99,
 *   minTemperature: 0.1,
 *   neighbourStep: 10
 * };
 * const result = simulatedAnnealingOptimization(saOptions);
 * console.log("Best SA Palette:", result.solution.map(c => c.hex));
 * console.log("Best Fitness:", result.fitness);
 * console.log("Iterations:", result.iterations);
 */
export function simulatedAnnealingOptimization(
  options: SimulatedAnnealingOptions,
): {
  solution: Palette; // Best solution found
  fitness: number; // Fitness of the best solution
  iterations: number;
  fitnessHistory: number[]; // Fitness history of the *current* solution
  temperatureHistory: number[];
} {
  const {
    primaryColor,
    initialSolution,
    maxIterations = 5000,
    initialTemperature = 100.0,
    coolingRate = 0.995,
    minTemperature = 0.1,
    neighbourStep = 15,
  } = options;

  if (!initialSolution || initialSolution.length !== 5) {
    throw new Error(
      "Simulated Annealing requires an initial palette of 5 IColor objects.",
    );
  }

  let currentSolution: Palette = initialSolution.map((c: IColor) => ({ ...c }));
  let currentFitness = evaluatePaletteSolution(primaryColor, currentSolution);

  if (!isFinite(currentFitness)) {
    console.warn(
      "Initial solution provided to Simulated Annealing has invalid fitness. Aborting.",
    );
    return {
      solution: initialSolution,
      fitness: -Infinity,
      iterations: 0,
      fitnessHistory: [-Infinity],
      temperatureHistory: [initialTemperature],
    };
  }

  let bestSolution: Palette = initialSolution.map((c: IColor) => ({ ...c })); // Track the best solution encountered
  let bestFitness = currentFitness;

  let temperature = initialTemperature;
  const fitnessHistory: number[] = [currentFitness];
  const temperatureHistory: number[] = [temperature];
  let iteration = 0;

  for (
    ;
    iteration < maxIterations && temperature > minTemperature;
    iteration++
  ) {
    const neighbourMoves = computeNeighbourMovesSA(
      currentSolution,
      neighbourStep,
    );
    if (neighbourMoves.length === 0) {
      // console.log("No more valid neighbour moves in SA. Stopping.");
      break;
    }

    // Select a random neighbour move
    const randomMove =
      neighbourMoves[Math.floor(Math.random() * neighbourMoves.length)];
    const neighbourSolution = applyMoveSA(currentSolution, randomMove);
    const neighbourFitness = evaluatePaletteSolution(
      primaryColor,
      neighbourSolution,
    );

    if (!isFinite(neighbourFitness)) {
      // Invalid neighbour, don't consider it, just record current state and cool down
      fitnessHistory.push(currentFitness);
      temperatureHistory.push(temperature);
      temperature *= coolingRate;
      continue;
    }

    const deltaFitness = neighbourFitness - currentFitness; // Positive if neighbour is better

    // Decide whether to accept the neighbour solution
    let acceptMove = false;
    if (deltaFitness > 0) {
      // Always accept better solutions
      acceptMove = true;
    } else {
      // Accept worse solutions probabilistically based on temperature
      const acceptanceProbability = Math.exp(deltaFitness / temperature);
      acceptMove = Math.random() < acceptanceProbability;
    }

    if (acceptMove) {
      currentSolution = neighbourSolution;
      currentFitness = neighbourFitness;

      // Update the overall best solution if the current one is better
      if (currentFitness > bestFitness) {
        bestFitness = currentFitness;
        bestSolution = currentSolution.map((c: IColor) => ({ ...c })); // Store a copy
      }
    }
    // If move not accepted, currentSolution and currentFitness remain unchanged

    fitnessHistory.push(currentFitness); // Log the fitness of the current solution for this iteration
    temperatureHistory.push(temperature);
    temperature *= coolingRate; // Cool down
  }

  return {
    solution: bestSolution, // Return the best solution found overall
    fitness: bestFitness,
    iterations: iteration,
    fitnessHistory,
    temperatureHistory,
  };
}
