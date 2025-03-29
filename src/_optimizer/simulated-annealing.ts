// palettes/src/optimizer/simulated-annealing.ts
import { clamp, evaluatePaletteSolution, randomInt } from "./utils.ts";
import { fromIColor, type IColor, toIColor } from "../core/color-operations.ts";
import chroma from "chroma-js";

type Palette = IColor[];
// Define a move: change a specific channel of a specific color in the palette
type Move = {
  paletteIndex: number; // Index of the color in the palette array
  channel: "r" | "g" | "b"; // Which channel to change
  change: number; // Amount to change by (+/-)
};

/**
 * Generates possible neighboring moves by slightly modifying one color channel
 * of the current palette.
 */
function computeNeighbourMoves(palette: Palette, step: number = 10): Move[] {
  const moves: Move[] = [];
  palette.forEach((color, index) => {
    const [r, g, b] = color.rgb;
    // Possible moves for Red channel
    if (r < 255 - step) {
      moves.push({ paletteIndex: index, channel: "r", change: step });
    }
    if (r > step) {
      moves.push({ paletteIndex: index, channel: "r", change: -step });
    }
    // Possible moves for Green channel
    if (g < 255 - step) {
      moves.push({ paletteIndex: index, channel: "g", change: step });
    }
    if (g > step) {
      moves.push({ paletteIndex: index, channel: "g", change: -step });
    }
    // Possible moves for Blue channel
    if (b < 255 - step) {
      moves.push({ paletteIndex: index, channel: "b", change: step });
    }
    if (b > step) {
      moves.push({ paletteIndex: index, channel: "b", change: -step });
    }
  });
  return moves;
}

/**
 * Applies a move to a palette, returning a new palette.
 */
function applyMove(palette: Palette, move: Move): Palette {
  const newPalette = [...palette]; // Create a copy
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
  // Create a new IColor object for the modified color
  newPalette[move.paletteIndex] = toIColor(chroma(r, g, b));
  return newPalette;
}

/**
 * Optimizes a color palette using Simulated Annealing.
 * Allows escaping local optima by sometimes accepting worse solutions based on temperature.
 *
 * @param primaryColor - The primary IColor to evaluate against.
 * @param initialPalette - The starting IColor[] palette (must contain 5 colors).
 * @param maxIterations - Maximum number of iterations.
 * @param initialTemperature - Starting temperature for annealing.
 * @param coolingRate - Multiplicative factor for temperature decay (e.g., 0.99).
 * @param neighbourStep - The +/- change applied to RGB channels to find neighbours.
 * @param minTemperature - Temperature below which the process stops.
 * @returns Object containing the best solution found, iterations, fitness history, and temperature history.
 */
export function simulatedAnnealingOptimization(
  primaryColor: IColor,
  initialPalette: Palette,
  maxIterations: number = 5000, // SA might need more iterations
  initialTemperature: number = 100.0,
  coolingRate: number = 0.995, // Slower cooling can be better
  neighbourStep: number = 15, // Slightly larger steps might explore more
  minTemperature: number = 0.1,
): {
  solution: Palette;
  fitness: number;
  iterations: number;
  fitnessHistory: number[];
  temperatureHistory: number[];
} {
  if (!initialPalette || initialPalette.length !== 5) {
    throw new Error("Initial palette must be an array of 5 IColor objects.");
  }

  let currentSolution: Palette = [...initialPalette];
  let currentFitness = evaluatePaletteSolution(primaryColor, currentSolution);
  let bestSolution: Palette = [...currentSolution]; // Track the best solution found
  let bestFitness = currentFitness;

  let temperature = initialTemperature;
  let fitnessHistory: number[] = [currentFitness];
  let temperatureHistory: number[] = [temperature];
  let iteration = 0;

  for (
    ; iteration < maxIterations && temperature > minTemperature; iteration++
  ) {
    if (!isFinite(currentFitness)) {
      console.warn(
        `Iteration ${iteration}: Current fitness is invalid (${currentFitness}). Resetting or stopping.`,
      );
      // Option: Reset to best known solution? Or just stop? Let's stop for now.
      break;
    }

    const neighbourMoves = computeNeighbourMoves(
      currentSolution,
      neighbourStep,
    );
    if (neighbourMoves.length === 0) {
      // console.log(`No more valid neighbour moves at iteration ${iteration}. Stopping.`);
      break; // No possible moves
    }

    // Select a random neighbour move
    const randomMove =
      neighbourMoves[Math.floor(Math.random() * neighbourMoves.length)];
    const neighbourSolution = applyMove(currentSolution, randomMove);
    const neighbourFitness = evaluatePaletteSolution(
      primaryColor,
      neighbourSolution,
    );

    if (!isFinite(neighbourFitness)) {
      // Skip this invalid neighbour
      fitnessHistory.push(currentFitness); // Log current fitness again
      temperatureHistory.push(temperature);
      temperature *= coolingRate; // Still cool down
      continue;
    }

    let acceptMove = false;
    // Always accept better solutions
    if (neighbourFitness > currentFitness) {
      acceptMove = true;
    } else {
      // Accept worse solutions based on probability and temperature
      const deltaFitness = currentFitness - neighbourFitness; // Difference is positive for worse neighbour
      const acceptanceProbability = Math.exp(-deltaFitness / temperature);
      acceptMove = Math.random() < acceptanceProbability;
    }

    if (acceptMove) {
      currentSolution = neighbourSolution;
      currentFitness = neighbourFitness;

      // Update best solution if current is better than overall best
      if (currentFitness > bestFitness) {
        bestFitness = currentFitness;
        bestSolution = [...currentSolution]; // Store copy of the best
      }
    }
    // If move not accepted, currentSolution and currentFitness remain the same

    fitnessHistory.push(currentFitness); // Log fitness for this iteration
    temperatureHistory.push(temperature);
    temperature *= coolingRate; // Cool down
  }

  return {
    solution: bestSolution, // Return the best solution found over all iterations
    fitness: bestFitness,
    iterations: iteration,
    fitnessHistory,
    temperatureHistory,
  };
}
