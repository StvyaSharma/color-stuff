// palettes/src/optimizer/genetic-crossover.ts
import { clamp, evaluatePaletteSolution, randomInt } from "./utils.ts";
import { type IColor, toIColor } from "../core/color-operations.ts";

type Palette = IColor[];
type Parents = [Palette, Palette];
export type CrossoverOperation =
  | "one-point" // Swaps tails after one point
  | "two-point" // Swaps middle section
  | "block" // Swaps a random contiguous block of colors
  | "uniform" // Swaps individual colors (genes) randomly
  | "shuffle"; // Shuffles a segment within the palette

// --- selectParents function remains the same ---
function selectParents(
  population: Palette[],
  populationEvals: number[],
): Parents {
  const popSize = population.length;

  // Filter out invalid evaluations (-Infinity) before sorting
  const validEvals = populationEvals
    .map((val, idx) => ({ val, idx }))
    .filter((item) => isFinite(item.val));

  if (validEvals.length === 0) {
    // Handle case where all evaluations are invalid
    console.warn(
      "No valid evaluations found in population for parent selection.",
    );
    const idx1 = randomInt(0, popSize - 1);
    let idx2 = randomInt(0, popSize - 1);
    while (idx1 === idx2 && popSize > 1) {
      idx2 = randomInt(0, popSize - 1);
    }
    return [population[idx1], population[idx2]];
  }

  // Sort valid evaluations by fitness (descending)
  const sortedPopEvals = validEvals.sort((a, b) => b.val - a.val);

  // Calculate ranks only for valid individuals
  const ranks = new Map<number, number>(); // Map original index to rank
  let currentRank = 1;
  ranks.set(sortedPopEvals[0].idx, currentRank);

  for (let i = 1; i < sortedPopEvals.length; i++) {
    if (sortedPopEvals[i].val !== sortedPopEvals[i - 1].val) {
      currentRank++;
    }
    ranks.set(sortedPopEvals[i].idx, currentRank);
  }

  // Assign worst rank to invalid individuals if any
  const worstRank = currentRank + 1;
  for (let i = 0; i < popSize; i++) {
    if (!ranks.has(i)) {
      ranks.set(i, worstRank);
    }
  }

  // Calculate selection probabilities based on rank (lower rank = higher probability)
  const rankValues = Array.from(ranks.values());
  const totalInvertedRankScore = rankValues.reduce(
    (sum, rank) => sum + (worstRank - rank),
    0,
  );

  const probs: number[] = [];
  for (let i = 0; i < popSize; i++) {
    const rank = ranks.get(i)!;
    const prob = totalInvertedRankScore > 0
      ? (worstRank - rank) / totalInvertedRankScore
      : (1 / popSize);
    probs.push(prob);
  }

  // Select parents using roulette wheel
  const selectedParentsIdx: number[] = [];
  for (let i = 0; i < 2; i++) {
    const rand = Math.random();
    let idx = 0;
    let acc = probs[0];
    while (acc < rand && idx < popSize - 1) {
      idx++;
      acc += probs[idx];
    }
    // Avoid selecting the same parent twice if possible
    if (
      i === 1 && selectedParentsIdx.length === 1 &&
      idx === selectedParentsIdx[0] &&
      popSize > 1
    ) {
      idx = (idx + 1) % popSize; // Simple shift to next index
    }
    selectedParentsIdx.push(idx);
  }

  // Ensure two different parents if popSize > 1
  if (popSize > 1 && selectedParentsIdx[0] === selectedParentsIdx[1]) {
    selectedParentsIdx[1] = (selectedParentsIdx[0] + 1) % popSize;
  }

  return [population[selectedParentsIdx[0]], population[selectedParentsIdx[1]]];
}

/**
 * Performs crossover and mutation on parent palettes to create offspring.
 */
function performCrossoverAndMutation(
  parents: Parents,
  crossoverProbability: number,
  mutationProbability: number, // Probability per color in palette
  mutationAmount: number, // Max +/- change for RGB channels
  crossoverOperation: CrossoverOperation = "uniform",
): [Palette, Palette] {
  const [parent1, parent2] = parents;
  const paletteLength = parent1.length; // Assume parents have same length
  let offspring1: Palette = [...parent1]; // Create copies
  let offspring2: Palette = [...parent2];

  // --- Crossover ---
  if (Math.random() < crossoverProbability / 100 && paletteLength > 1) {
    switch (crossoverOperation) {
      case "uniform":
        // Standard uniform crossover: swap individual colors (genes) with 50% probability
        for (let i = 0; i < paletteLength; i++) {
          if (Math.random() < 0.5) {
            // Swap the IColor objects at this position
            [offspring1[i], offspring2[i]] = [offspring2[i], offspring1[i]];
          }
        }
        break;

      case "one-point": {
        // Find a single point (not the ends) to split and swap tails
        const point = randomInt(1, paletteLength - 1);
        const tail1 = offspring1.slice(point);
        const tail2 = offspring2.slice(point);
        offspring1 = [...offspring1.slice(0, point), ...tail2];
        offspring2 = [...offspring2.slice(0, point), ...tail1];
        break;
      }

      case "two-point": {
        // Find two points, swap the middle section
        if (paletteLength < 3) break; // Need at least 3 genes for two-point crossover
        // Ensure point1 < point2 and they are not the very ends
        const point1 = randomInt(1, paletteLength - 2);
        const point2 = randomInt(point1 + 1, paletteLength - 1);
        const middle1 = offspring1.slice(point1, point2);
        const middle2 = offspring2.slice(point1, point2);
        offspring1 = [
          ...offspring1.slice(0, point1),
          ...middle2,
          ...offspring1.slice(point2),
        ];
        offspring2 = [
          ...offspring2.slice(0, point1),
          ...middle1,
          ...offspring2.slice(point2),
        ];
        break;
      }

      case "block": {
        // Select a random start point for the block
        const start = randomInt(0, paletteLength - 1);
        // Select a random end point for the block (must be >= start)
        const end = randomInt(start, paletteLength - 1);
        // The block includes elements from index 'start' up to and including 'end'

        // Extract the blocks
        const block1 = offspring1.slice(start, end + 1);
        const block2 = offspring2.slice(start, end + 1);

        // Create new offspring by swapping the blocks
        // Need to be careful with array modification in place vs reconstruction
        const tempOffspring1 = [...offspring1];
        const tempOffspring2 = [...offspring2];

        for (let i = 0; i < block1.length; i++) {
          tempOffspring1[start + i] = block2[i];
          tempOffspring2[start + i] = block1[i];
        }
        offspring1 = tempOffspring1;
        offspring2 = tempOffspring2;
        break;
      }

      case "shuffle": {
        // Choose a sub-sequence, shuffle it, and place it back
        if (paletteLength < 3) {
          break; // No change if too short
        }
        // Choose two distinct crossover points (indices)
        let point1 = randomInt(0, paletteLength - 2);
        let point2 = randomInt(point1 + 1, paletteLength - 1); // Ensure point2 > point1

        // --- Shuffle section for offspring1 based on parent1 ---
        const section1 = parent1.slice(point1, point2 + 1); // Extract section
        // Fisher-Yates (Knuth) Shuffle
        for (let i = section1.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [section1[i], section1[j]] = [section1[j], section1[i]]; // Swap
        }
        // Reconstruct offspring1
        offspring1 = [
          ...parent1.slice(0, point1),
          ...section1,
          ...parent1.slice(point2 + 1),
        ];

        // --- Shuffle section for offspring2 based on parent2 ---
        const section2 = parent2.slice(point1, point2 + 1); // Extract section
        // Fisher-Yates (Knuth) Shuffle
        for (let i = section2.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [section2[i], section2[j]] = [section2[j], section2[i]]; // Swap
        }
        // Reconstruct offspring2
        offspring2 = [
          ...parent2.slice(0, point1),
          ...section2,
          ...parent2.slice(point2 + 1),
        ];
        break;
      }
    }
  }
  // If no crossover, offspring remain copies of parents

  // --- Mutation ---
  const mutatePalette = (palette: Palette): Palette => {
    return palette.map((color) => {
      if (Math.random() < mutationProbability / 100) {
        // Mutate this color
        let [r, g, b] = color.rgb;
        const mutationType = Math.random(); // Determine mutation type

        if (mutationType < 0.7) { // 70% chance: small adjustment
          r = clamp(r + randomInt(-mutationAmount, mutationAmount), 0, 255);
          g = clamp(g + randomInt(-mutationAmount, mutationAmount), 0, 255);
          b = clamp(b + randomInt(-mutationAmount, mutationAmount), 0, 255);
        } else { // 30% chance: completely random channel
          const channel = randomInt(0, 2);
          if (channel === 0) r = randomInt(0, 255);
          else if (channel === 1) g = randomInt(0, 255);
          else b = randomInt(0, 255);
        }
        // Use toIColor which handles chroma conversion
        return toIColor([r, g, b]);
      }
      return color; // No mutation
    });
  };

  offspring1 = mutatePalette(offspring1);
  offspring2 = mutatePalette(offspring2);

  return [offspring1, offspring2];
}

// --- geneticCrossoverOptimization function remains the same ---
/**
 * Optimizes a color palette using a genetic algorithm with crossover and mutation.
 *
 * @param primaryColor - The primary IColor to evaluate against.
 * @param initialPopulation - An array of initial palettes (IColor[]). Population size is determined by this array's length.
 * @param maxIterations - Maximum number of generations.
 * @param crossoverProbability - Probability of crossover occurring (0-100).
 * @param mutationProbability - Probability of mutation per color gene (0-100).
 * @param mutationAmount - Max +/- RGB change during small mutations.
 * @param thresholdFitness - If the average fitness reaches this value, stop early.
 * @param crossoverOperation - The type of crossover to use.
 * @returns Object containing the final population, iteration count, and fitness history.
 */
export function geneticCrossoverOptimization(
  primaryColor: IColor,
  initialPopulation: Palette[], // Use this to set population and size
  maxIterations: number = 1000,
  crossoverProbability: number = 70,
  mutationProbability: number = 10, // Probability per color gene
  mutationAmount: number = 20,
  thresholdFitness: number = 80, // Define based on evaluatePaletteSolution scale
  crossoverOperation: CrossoverOperation = "uniform",
): {
  population: Palette[];
  bestPalette: Palette;
  bestFitness: number;
  iterations: number;
  fitnessHistory: number[][];
} {
  if (!initialPopulation || initialPopulation.length < 2) {
    throw new Error("Initial population must contain at least two palettes.");
  }
  // Deep copy initial population to avoid modifying the original array
  let population: Palette[] = initialPopulation.map((palette) => [...palette]);
  const populationSize = population.length;
  let fitnessHistory: number[][] = [];
  let iteration = 0;
  let bestOverallPalette: Palette = population[0];
  let bestOverallFitness = -Infinity;

  for (; iteration < maxIterations; iteration++) {
    // Evaluate current population
    const populationEvals = population.map((palette) =>
      evaluatePaletteSolution(primaryColor, palette)
    );
    fitnessHistory.push([...populationEvals]); // Store evaluations for this generation

    // Update best overall solution found so far
    let currentBestFitness = -Infinity;
    let currentBestIdx = -1;
    for (let i = 0; i < populationEvals.length; i++) {
      if (populationEvals[i] > currentBestFitness) {
        currentBestFitness = populationEvals[i];
        currentBestIdx = i;
      }
    }
    if (currentBestFitness > bestOverallFitness) {
      bestOverallFitness = currentBestFitness;
      bestOverallPalette = [...population[currentBestIdx]]; // Store a copy
    }

    // Check termination condition (e.g., average fitness threshold)
    const validEvals = populationEvals.filter(isFinite);
    const avgFitness = validEvals.reduce((sum, fit) => sum + fit, 0) /
      (validEvals.length || 1); // Avoid division by zero

    if (isFinite(avgFitness) && avgFitness >= thresholdFitness) {
      // console.log(`Average fitness threshold (${thresholdFitness}) reached at iteration ${iteration}.`);
      break;
    }
    // Or stop if best fitness is very high (adjust threshold as needed)
    if (bestOverallFitness > 100) { // Example high threshold
      // console.log(`High best fitness (${bestOverallFitness.toFixed(2)}) reached at iteration ${iteration}.`);
      break;
    }

    // --- Selection, Crossover, Mutation, Replacement ---
    const nextPopulation: Palette[] = [];

    // Elitism: Keep the best individual from the current generation
    if (currentBestIdx !== -1) {
      nextPopulation.push([...population[currentBestIdx]]);
    } else if (population.length > 0) {
      // Fallback if all individuals were invalid
      nextPopulation.push([...population[0]]);
    }

    // Fill the rest of the new population
    while (nextPopulation.length < populationSize) {
      const parents = selectParents(population, populationEvals);
      const [offspring1, offspring2] = performCrossoverAndMutation(
        parents,
        crossoverProbability,
        mutationProbability,
        mutationAmount,
        crossoverOperation,
      );

      // Add offspring to the next population
      nextPopulation.push(offspring1);
      if (nextPopulation.length < populationSize) {
        nextPopulation.push(offspring2);
      }
    }

    // Simple replacement: the new generation replaces the old
    population = nextPopulation;
  }

  // Final evaluation to ensure bestFitness is up-to-date with the final population
  const finalEvals = population.map((palette) =>
    evaluatePaletteSolution(primaryColor, palette)
  );
  let finalBestFitness = bestOverallFitness;
  let finalBestPalette = bestOverallPalette;

  for (let i = 0; i < finalEvals.length; i++) {
    if (finalEvals[i] > finalBestFitness) {
      finalBestFitness = finalEvals[i];
      finalBestPalette = [...population[i]];
    }
  }

  return {
    population,
    bestPalette: finalBestPalette,
    bestFitness: finalBestFitness,
    iterations: iteration,
    fitnessHistory,
  };
}
