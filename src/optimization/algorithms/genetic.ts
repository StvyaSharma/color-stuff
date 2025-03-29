/**
 * @file optimization/algorithms/genetic.ts
 * Implements genetic algorithm variations for palette optimization and single color evolution.
 */
import chroma from "chroma-js";
import { type IColor, type Palette } from "../../core/color.types.ts";
import { fromIColor, toIColor } from "../../core/conversions.ts";
import { colorDifference } from "../../core/operations.ts";
import { clamp, randomInt } from "../../utils/math.ts";
import { evaluatePaletteSolution } from "../fitness.ts"; // Centralized fitness function
import type {
  CrossoverOperation,
  EvolveSingleColorOptions,
  GeneticAlgorithmOptions,
  Individual,
} from "../optimization.types.ts";

// --- Helper: Parent Selection ---
// Selects parents based on fitness ranks (lower rank = higher probability)
function selectParentsByRank(
  population: Individual<Palette>[],
): [Individual<Palette>, Individual<Palette>] {
  const popSize = population.length;
  if (popSize < 2) {
    throw new Error("Population size must be at least 2 for selection.");
  }

  // Filter out invalid fitness scores first
  const validPopulation = population.filter((ind) => isFinite(ind.fitness));
  if (validPopulation.length < 2) {
    console.warn(
      "Not enough individuals with valid fitness for rank selection. Using random selection.",
    );
    const idx1 = randomInt(0, popSize - 1);
    let idx2 = randomInt(0, popSize - 1);
    while (idx1 === idx2) idx2 = randomInt(0, popSize - 1);
    return [population[idx1], population[idx2]];
  }

  // Sort valid individuals by fitness (descending - higher fitness is better)
  validPopulation.sort((a, b) => b.fitness - a.fitness);

  // Assign ranks (rank 1 is best)
  const ranks = new Map<number, number>(); // Map original index to rank
  let currentRank = 1;
  // Find original index mapping (assuming population array order corresponds to initial state)
  // This mapping is tricky if population array is modified directly. It's safer to work with the sorted validPopulation.
  // Let's rethink: we need to select from the original population based on rank derived from valid fitness.

  // Alternative: Calculate total "inverted rank score" for roulette
  const numValid = validPopulation.length;
  const rankScores: { index: number; score: number }[] = [];
  let totalScore = 0;

  // Assign scores based on rank (higher score for better rank)
  validPopulation.forEach((individual, rankIndex) => {
    // Find the original index of this individual in the main population array
    const originalIndex = population.findIndex((p) => p === individual); // This relies on object identity
    if (originalIndex !== -1) {
      const score = numValid - rankIndex; // Simple linear rank score (best has score numValid)
      rankScores.push({ index: originalIndex, score: score });
      totalScore += score;
    }
  });

  // Fill scores for invalid individuals (lowest score = 0)
  population.forEach((individual, index) => {
    if (!validPopulation.includes(individual)) {
      rankScores.push({ index: index, score: 0 });
    }
  });

  // Select two parents using roulette wheel on scores
  const selectedIndices: number[] = [];
  for (let i = 0; i < 2; i++) {
    let cumulativeScore = 0;
    const randomPick = Math.random() * totalScore;
    let selectedIdx = -1;

    for (const item of rankScores) {
      cumulativeScore += item.score;
      if (cumulativeScore >= randomPick) {
        selectedIdx = item.index;
        break;
      }
    }
    // Fallback if something goes wrong
    if (selectedIdx === -1) {
      selectedIdx = rankScores[rankScores.length - 1]?.index ?? 0;
    }

    // Avoid selecting the same parent twice if possible
    if (
      i === 1 && selectedIndices.length > 0 &&
      selectedIdx === selectedIndices[0] && popSize > 1
    ) {
      selectedIdx = (selectedIdx + 1) % popSize; // Simple wrap around
    }
    selectedIndices.push(selectedIdx);
  }

  // Final check to ensure different parents if possible
  if (popSize > 1 && selectedIndices[0] === selectedIndices[1]) {
    selectedIndices[1] = (selectedIndices[0] + 1) % popSize;
  }

  return [population[selectedIndices[0]], population[selectedIndices[1]]];
}

// --- Helper: Crossover and Mutation ---
function performCrossoverAndMutation(
  parents: [Individual<Palette>, Individual<Palette>],
  crossoverProbability: number,
  mutationProbability: number,
  mutationAmount: number,
  crossoverOperation: CrossoverOperation,
): [Palette, Palette] {
  const [parent1, parent2] = parents.map((p) => p.solution); // Get palettes
  const paletteLength = parent1.length;
  let offspring1: Palette = parent1.map((c) => ({ ...c })); // Deep copy palettes
  let offspring2: Palette = parent2.map((c) => ({ ...c }));

  // --- Crossover ---
  if (Math.random() * 100 < crossoverProbability && paletteLength > 1) {
    switch (crossoverOperation) {
      case "uniform":
        for (let i = 0; i < paletteLength; i++) {
          if (Math.random() < 0.5) {
            [offspring1[i], offspring2[i]] = [offspring2[i], offspring1[i]];
          }
        }
        break;
      case "one-point": {
        const point = randomInt(1, paletteLength - 1);
        const tail1 = offspring1.slice(point);
        const tail2 = offspring2.slice(point);
        offspring1 = [...offspring1.slice(0, point), ...tail2];
        offspring2 = [...offspring2.slice(0, point), ...tail1];
        break;
      }
      case "two-point": {
        if (paletteLength < 3) break;
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
      // Add block and shuffle cases if implemented similarly to original
      case "block": {
        const start = randomInt(0, paletteLength - 1);
        const end = randomInt(start, paletteLength - 1);
        const block1 = offspring1.slice(start, end + 1);
        const block2 = offspring2.slice(start, end + 1);
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
        if (paletteLength < 3) break;
        let point1 = randomInt(0, paletteLength - 2);
        let point2 = randomInt(point1 + 1, paletteLength - 1);
        // Shuffle offspring1 section based on parent1
        const section1 = parent1.slice(point1, point2 + 1);
        for (let i = section1.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [section1[i], section1[j]] = [section1[j], section1[i]];
        }
        offspring1 = [
          ...parent1.slice(0, point1),
          ...section1,
          ...parent1.slice(point2 + 1),
        ];
        // Shuffle offspring2 section based on parent2
        const section2 = parent2.slice(point1, point2 + 1);
        for (let i = section2.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [section2[i], section2[j]] = [section2[j], section2[i]];
        }
        offspring2 = [
          ...parent2.slice(0, point1),
          ...section2,
          ...parent2.slice(point2 + 1),
        ];
        break;
      }
    }
  }

  // --- Mutation ---
  const mutatePalette = (palette: Palette): Palette => {
    return palette.map((color) => {
      if (Math.random() * 100 < mutationProbability) { // Mutate this color
        let [r, g, b] = color.rgb;
        const mutationType = Math.random();
        if (mutationType < 0.7) { // Small adjustment
          r = clamp(r + randomInt(-mutationAmount, mutationAmount), 0, 255);
          g = clamp(g + randomInt(-mutationAmount, mutationAmount), 0, 255);
          b = clamp(b + randomInt(-mutationAmount, mutationAmount), 0, 255);
        } else { // Random channel reset
          const channel = randomInt(0, 2);
          if (channel === 0) r = randomInt(0, 255);
          else if (channel === 1) g = randomInt(0, 255);
          else b = randomInt(0, 255);
        }
        return toIColor([r, g, b]); // Create new IColor
      }
      return color; // No mutation
    });
  };

  offspring1 = mutatePalette(offspring1);
  offspring2 = mutatePalette(offspring2);

  return [offspring1, offspring2];
}

/**
 * Optimizes a color palette using a genetic algorithm with crossover and mutation.
 *
 * @param options - Configuration options for the genetic algorithm.
 * @returns Object containing the final population, best palette, best fitness, iteration count, and fitness history.
 * @throws Error if initial population size is less than 2.
 *
 * @example
 * const initialPop = [ createRandomPalette(5), createRandomPalette(5), ... ]; // Need a function to create initial palettes
 * const gaOptions: GeneticAlgorithmOptions = {
 *   primaryColor: toIColor('blue'),
 *   initialSolution: initialPop,
 *   maxIterations: 500,
 *   crossoverProbability: 80,
 *   mutationProbability: 5, // Per color gene
 *   mutationAmount: 15,
 *   thresholdFitness: 95, // Target fitness score
 *   crossoverOperation: 'uniform',
 *   elitismCount: 1
 * };
 * const result = geneticCrossoverOptimization(gaOptions);
 * console.log("Best GA Palette:", result.bestPalette.map(c => c.hex));
 * console.log("Best Fitness:", result.bestFitness);
 */
export function geneticCrossoverOptimization(
  options: GeneticAlgorithmOptions,
): {
  population: Palette[];
  bestPalette: Palette;
  bestFitness: number;
  iterations: number;
  fitnessHistory: number[][]; // Stores fitness of all individuals per generation
} {
  const {
    primaryColor,
    initialSolution, // Expect Palette[]
    maxIterations = 1000,
    crossoverProbability = 70,
    mutationProbability = 10,
    mutationAmount = 20,
    thresholdFitness = 90, // Adjusted default
    crossoverOperation = "uniform",
    elitismCount = 1, // Keep the best 1 individual by default
  } = options;

  if (!Array.isArray(initialSolution) || initialSolution.length < 2) {
    throw new Error(
      "Initial solution for GA must be an array (population) of at least two palettes.",
    );
  }

  const populationSize = initialSolution.length;
  let population: Individual<Palette>[] = initialSolution.map((palette) => ({
    solution: palette.map((c) => ({ ...c })), // Deep copy
    fitness: evaluatePaletteSolution(primaryColor, palette),
  }));

  let fitnessHistory: number[][] = [];
  let iteration = 0;
  let bestOverallIndividual: Individual<Palette> | null = null;

  // Find initial best
  population.forEach((ind) => {
    if (
      !bestOverallIndividual ||
      (isFinite(ind.fitness) && ind.fitness > bestOverallIndividual.fitness)
    ) {
      bestOverallIndividual = {
        solution: ind.solution.map((c) => ({ ...c })),
        fitness: ind.fitness,
      };
    }
  });
  if (!bestOverallIndividual) { // Handle case where initial pop had no valid fitness
    bestOverallIndividual = {
      solution: population[0].solution.map((c) => ({ ...c })),
      fitness: -Infinity,
    };
  }

  for (; iteration < maxIterations; iteration++) {
    const currentEvals = population.map((ind) => ind.fitness);
    fitnessHistory.push(currentEvals);

    // Update best overall solution
    population.forEach((ind) => {
      if (
        isFinite(ind.fitness) && ind.fitness > bestOverallIndividual!.fitness
      ) {
        bestOverallIndividual = {
          solution: ind.solution.map((c) => ({ ...c })),
          fitness: ind.fitness,
        };
      }
    });

    // Check termination condition
    const validEvals = currentEvals.filter(isFinite);
    const avgFitness = validEvals.length > 0
      ? validEvals.reduce((sum, fit) => sum + fit, 0) / validEvals.length
      : -Infinity;

    if (isFinite(avgFitness) && avgFitness >= thresholdFitness) break;
    if (
      isFinite(bestOverallIndividual!.fitness) &&
      bestOverallIndividual!.fitness >= thresholdFitness * 1.1
    ) break; // Stop if best is significantly good

    // --- Create Next Generation ---
    const nextPopulationIndividuals: Individual<Palette>[] = [];

    // Elitism: Carry over the best individuals
    if (elitismCount > 0) {
      population.sort((a, b) => b.fitness - a.fitness); // Sort descending by fitness
      for (let i = 0; i < Math.min(elitismCount, populationSize); i++) {
        if (isFinite(population[i].fitness)) { // Only carry over valid individuals
          nextPopulationIndividuals.push({
            solution: population[i].solution.map((c) => ({ ...c })),
            fitness: population[i].fitness,
          });
        }
      }
    }

    // Fill the rest of the population via selection, crossover, mutation
    while (nextPopulationIndividuals.length < populationSize) {
      const parents = selectParentsByRank(population); // Use rank selection
      const [offspring1Solution, offspring2Solution] =
        performCrossoverAndMutation(
          parents,
          crossoverProbability,
          mutationProbability,
          mutationAmount,
          crossoverOperation,
        );

      // Evaluate offspring
      const offspring1Fitness = evaluatePaletteSolution(
        primaryColor,
        offspring1Solution,
      );
      const offspring2Fitness = evaluatePaletteSolution(
        primaryColor,
        offspring2Solution,
      );

      nextPopulationIndividuals.push({
        solution: offspring1Solution,
        fitness: offspring1Fitness,
      });
      if (nextPopulationIndividuals.length < populationSize) {
        nextPopulationIndividuals.push({
          solution: offspring2Solution,
          fitness: offspring2Fitness,
        });
      }
    }

    population = nextPopulationIndividuals; // Replace old population
  }

  // Final update of best overall after loop terminates
  population.forEach((ind) => {
    if (
      isFinite(ind.fitness) &&
      (!bestOverallIndividual || ind.fitness > bestOverallIndividual.fitness)
    ) {
      bestOverallIndividual = {
        solution: ind.solution.map((c) => ({ ...c })),
        fitness: ind.fitness,
      };
    }
  });

  return {
    population: population.map((ind) => ind.solution), // Return just the palettes
    bestPalette: bestOverallIndividual!.solution,
    bestFitness: bestOverallIndividual!.fitness,
    iterations: iteration,
    fitnessHistory,
  };
}

// =========================================================================
// == Single Color Evolution (Simpler GA focused on matching one color) ==
// =========================================================================

interface ColorIndividual {
  color: IColor;
  fitness: number;
}

/**
 * Evolves a single color towards a target color using a genetic algorithm approach.
 * This is a simpler GA focusing only on color difference as fitness.
 *
 * @param options - Configuration options for single color evolution.
 * @returns The best matching IColor found in the final population.
 *
 * @example
 * const target = toIColor('purple');
 * const evolveOptions: EvolveSingleColorOptions = {
 *   targetColor: target,
 *   populationSize: 50,
 *   generations: 500,
 *   mutationRate: 0.1, // Higher mutation might be needed
 *   mutationAmount: 25
 * };
 * const evolvedColor = evolveSingleColor(evolveOptions);
 * console.log(`Evolved color towards ${target.hex}: ${evolvedColor.hex}`);
 */
export function evolveSingleColor(options: EvolveSingleColorOptions): IColor {
  const {
    targetColor,
    populationSize = 50,
    generations = 500,
    mutationRate = 0.08, // Probability 0-1
    mutationAmount = 20,
  } = options;

  let population: ColorIndividual[] = [];
  let totalFitness = 0;

  // --- Fitness: Inverse of color difference ---
  // Higher fitness for lower difference. Max fitness arbitrarily set (e.g., 100 for perfect match).
  const calculateFitness = (individualColor: IColor): number => {
    const diff = colorDifference(individualColor, targetColor); // DeltaE 2000
    const maxPossibleDiff = 100; // DeltaE 2000 rarely exceeds 100 significantly
    const fitness = Math.max(0, 100 * (1 - diff / maxPossibleDiff)); // Scale 0-100
    return fitness; // Keep float for potentially better selection
  };

  // --- Initialize Population ---
  for (let i = 0; i < populationSize; i++) {
    const randomR = randomInt(0, 255);
    const randomG = randomInt(0, 255);
    const randomB = randomInt(0, 255);
    const initialColor = toIColor([randomR, randomG, randomB]);
    const fitness = calculateFitness(initialColor);
    population[i] = { color: initialColor, fitness };
    totalFitness += fitness;
  }

  // --- Selection (Roulette Wheel) ---
  const chooseParentIndex = (): number => {
    if (totalFitness <= 0) return randomInt(0, populationSize - 1);
    let randomPick = Math.random() * totalFitness;
    let currentSum = 0;
    for (let i = 0; i < populationSize; i++) {
      currentSum += population[i].fitness;
      if (currentSum >= randomPick) {
        return i;
      }
    }
    return populationSize - 1; // Fallback
  };

  // --- Mutation ---
  const mutate = (individual: ColorIndividual): ColorIndividual => {
    let [r, g, b] = individual.color.rgb;
    let changed = false;

    if (Math.random() < mutationRate) {
      r = clamp(r + randomInt(-mutationAmount, mutationAmount), 0, 255);
      changed = true;
    }
    if (Math.random() < mutationRate) {
      g = clamp(g + randomInt(-mutationAmount, mutationAmount), 0, 255);
      changed = true;
    }
    if (Math.random() < mutationRate) {
      b = clamp(b + randomInt(-mutationAmount, mutationAmount), 0, 255);
      changed = true;
    }

    if (changed) {
      const mutatedColor = toIColor([r, g, b]);
      const newFitness = calculateFitness(mutatedColor);
      return { color: mutatedColor, fitness: newFitness };
    }
    return individual;
  };

  // --- Crossover (Uniform RGB) ---
  const breed = (
    parent1: ColorIndividual,
    parent2: ColorIndividual,
  ): ColorIndividual => {
    const [r1, g1, b1] = parent1.color.rgb;
    const [r2, g2, b2] = parent2.color.rgb;
    const r = Math.random() < 0.5 ? r1 : r2;
    const g = Math.random() < 0.5 ? g1 : g2;
    const b = Math.random() < 0.5 ? b1 : b2;
    const childColor = toIColor([r, g, b]);
    const fitness = calculateFitness(childColor);
    return { color: childColor, fitness };
  };

  // --- Evolution Loop ---
  for (let gen = 0; gen < generations; gen++) {
    const nextPopulation: ColorIndividual[] = [];
    let nextTotalFitness = 0;

    // Simple generational replacement with elitism (keep best 1)
    population.sort((a, b) => b.fitness - a.fitness);
    if (isFinite(population[0].fitness)) {
      nextPopulation.push(population[0]); // Keep the best
      nextTotalFitness += population[0].fitness;
    }

    while (nextPopulation.length < populationSize) {
      const parentIdx1 = chooseParentIndex();
      let parentIdx2 = chooseParentIndex();
      while (parentIdx1 === parentIdx2) parentIdx2 = chooseParentIndex(); // Ensure different parents

      const child = breed(population[parentIdx1], population[parentIdx2]);
      const mutatedChild = mutate(child);

      nextPopulation.push(mutatedChild);
      nextTotalFitness += mutatedChild.fitness;
    }

    population = nextPopulation;
    totalFitness = nextTotalFitness;

    // Optional: Check for convergence
    if (population[0].fitness > 99.5) { // Very close match
      // console.log(`Single color evolution converged early at generation ${gen}`);
      break;
    }
  }

  // Return the best individual from the final population
  population.sort((a, b) => b.fitness - a.fitness);
  return population[0].color;
}
