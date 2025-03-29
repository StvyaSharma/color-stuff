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
 * Generates neighboring palettes by slightly modifying one color channel
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
 * Optimizes a color palette using the Hill Climbing algorithm.
 * It iteratively moves towards better neighboring palettes until a local optimum is reached.
 *
 * @param primaryColor - The primary IColor to evaluate against.
 * @param initialPalette - The starting IColor[] palette (must contain 5 colors).
 * @param maxIterations - Maximum number of iterations to run.
 * @param patience - Number of iterations to wait without improvement before stopping.
 * @param neighbourStep - The +/- change applied to RGB channels to find neighbours.
 * @returns Object containing the optimized palette, iterations, and fitness history.
 */
export function hillClimbingOptimization(
  primaryColor: IColor,
  initialPalette: Palette,
  maxIterations: number = 1000,
  patience: number = 50,
  neighbourStep: number = 10,
): {
  solution: Palette;
  fitness: number;
  iterations: number;
  fitnessHistory: number[];
} {
  if (!initialPalette || initialPalette.length !== 5) {
    throw new Error("Initial palette must be an array of 5 IColor objects.");
  }

  let currentSolution: Palette = [...initialPalette]; // Start with a copy
  let currentFitness = evaluatePaletteSolution(primaryColor, currentSolution);
  let localPatience = 0;
  let fitnessHistory: number[] = [currentFitness];
  let iteration = 0;

  for (; iteration < maxIterations; iteration++) {
    if (!isFinite(currentFitness)) {
      console.warn(
        `Iteration ${iteration}: Current fitness is invalid (${currentFitness}). Stopping.`,
      );
      break;
    }

    const neighbourMoves = computeNeighbourMoves(
      currentSolution,
      neighbourStep,
    );
    let bestNeighbourSolution: Palette | null = null;
    let bestNeighbourFitness = -Infinity; // Initialize lower than any possible fitness

    for (const move of neighbourMoves) {
      const neighbourSolution = applyMove(currentSolution, move);
      const neighbourFitness = evaluatePaletteSolution(
        primaryColor,
        neighbourSolution,
      );

      // Find the neighbour with the absolute highest fitness
      if (
        isFinite(neighbourFitness) && neighbourFitness > bestNeighbourFitness
      ) {
        bestNeighbourFitness = neighbourFitness;
        bestNeighbourSolution = neighbourSolution;
      }
    }

    // If a better neighbour was found, move to it
    if (bestNeighbourSolution && bestNeighbourFitness > currentFitness) {
      currentSolution = bestNeighbourSolution;
      currentFitness = bestNeighbourFitness;
      fitnessHistory.push(currentFitness);
      localPatience = 0; // Reset patience since we improved
    } else {
      // No improvement or no valid neighbours
      localPatience++;
      fitnessHistory.push(currentFitness); // Log the same fitness
      if (localPatience >= patience) {
        // console.log(`Stopping hill climbing due to patience limit (${patience}) reached at iteration ${iteration}.`);
        break; // Stop if no improvement for 'patience' iterations
      }
    }
  }

  return {
    solution: currentSolution,
    fitness: currentFitness,
    iterations: iteration,
    fitnessHistory,
  };
}
