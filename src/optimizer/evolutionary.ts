import {
  colorDifference,
  fromIColor,
  type IColor,
  toIColor,
} from "../core/color-operations.ts";
import { clamp, randomInt } from "./utils.ts"; // Assuming clamp is in utils
import chroma from "chroma-js";

/** Represents an individual in the evolutionary population */
interface ColorIndividual {
  color: IColor;
  fitness: number;
}

const randomBool = (chance: number = 0.5): boolean => Math.random() < chance;

/**
 * Evolves a color towards a target color using a simple genetic algorithm approach.
 *
 * @param targetColor - The IColor object to evolve towards.
 * @param populationSize - The number of individuals in the population.
 * @param generations - The number of generations to run the evolution.
 * @param mutationRate - The probability of a color channel mutating (0 to 1).
 * @param mutationAmount - Max +/- change during mutation for RGB channels.
 * @returns The IColor object from the final population with the highest fitness.
 */
export function evolveSingleColor(
  targetColor: IColor,
  populationSize: number = 100,
  generations: number = 1000,
  mutationRate: number = 0.05, // Increased mutation rate slightly
  mutationAmount: number = 20, // Max change per mutation
): IColor {
  let population: ColorIndividual[] = [];
  let totalFitness = 0;

  // --- Fitness Calculation ---
  // Uses colorDifference (deltaE CIE76) from core operations.
  // Lower difference = higher fitness. Max difference is sqrt(100^2 + 2*128^2) ~ 246
  // Let's scale fitness from 0 to 100 where 100 is perfect match.
  const calculateFitness = (individualColor: IColor): number => {
    const diff = colorDifference(individualColor, targetColor);
    const maxDiff = 250; // Approximate max deltaE
    // Higher fitness for lower difference
    const fitness = Math.max(0, 100 * (1 - diff / maxDiff));
    return Math.round(fitness);
  };

  // --- Initialize Population ---
  for (let i = 0; i < populationSize; i++) {
    // Create random initial colors
    const randomR = randomInt(0, 255);
    const randomG = randomInt(0, 255);
    const randomB = randomInt(0, 255);
    const initialColor = toIColor(
      chroma(randomR, randomG, randomB),
    ); // Use chroma to create IColor

    const fitness = calculateFitness(initialColor);
    population[i] = { color: initialColor, fitness: fitness };
    totalFitness += fitness;
  }

  // --- Selection Functions (Fitness Proportionate Selection - Roulette Wheel) ---
  const chooseFit = (): number => {
    if (totalFitness <= 0) return randomInt(0, populationSize - 1); // Handle zero fitness case
    let number = Math.random() * totalFitness; // Use float for better distribution
    for (let i = 0; i < populationSize; i++) {
      if (population[i].fitness >= number) {
        return i;
      }
      number -= population[i].fitness;
    }
    // Fallback in case of floating point issues
    return populationSize - 1;
  };

  // Choose weakest (inverse fitness proportionate)
  const chooseWeak = (): number => {
    const maxPossibleFitnessSum = populationSize * 100;
    const totalWeakness = maxPossibleFitnessSum - totalFitness;
    if (totalWeakness <= 0) return randomInt(0, populationSize - 1); // All might be perfect

    let number = Math.random() * totalWeakness;
    for (let i = 0; i < populationSize; i++) {
      const weakness = 100 - population[i].fitness;
      if (weakness >= number) {
        return i;
      }
      number -= weakness;
    }
    // Fallback
    return populationSize - 1;
  };

  // --- Mutation Function ---
  const mutate = (individual: ColorIndividual): ColorIndividual => {
    let [r, g, b] = individual.color.rgb;
    let changed = false;

    if (randomBool(mutationRate)) {
      r = clamp(r + randomInt(-mutationAmount, mutationAmount), 0, 255);
      changed = true;
    }
    if (randomBool(mutationRate)) {
      g = clamp(g + randomInt(-mutationAmount, mutationAmount), 0, 255);
      changed = true;
    }
    if (randomBool(mutationRate)) {
      b = clamp(b + randomInt(-mutationAmount, mutationAmount), 0, 255);
      changed = true;
    }

    if (changed) {
      const mutatedColor = toIColor(chroma(r, g, b));
      const newFitness = calculateFitness(mutatedColor);
      return { color: mutatedColor, fitness: newFitness };
    }
    return individual; // Return original if no mutation occurred
  };

  // --- Crossover (Breeding) Function ---
  // Simple uniform crossover for RGB channels
  const breed = (
    parent1: ColorIndividual,
    parent2: ColorIndividual,
  ): ColorIndividual => {
    const [r1, g1, b1] = parent1.color.rgb;
    const [r2, g2, b2] = parent2.color.rgb;

    const r = randomBool() ? r1 : r2;
    const g = randomBool() ? g1 : g2;
    const b = randomBool() ? b1 : b2;

    const childColor = toIColor(chroma(r, g, b));
    const fitness = calculateFitness(childColor);
    return { color: childColor, fitness: fitness };
  };

  // --- Replacement Function ---
  const replaceWeak = (child: ColorIndividual) => {
    const weakId = chooseWeak();
    if (weakId >= 0 && weakId < populationSize) {
      const deceased = population[weakId];
      totalFitness = totalFitness - deceased.fitness + child.fitness; // Update total fitness
      population[weakId] = child;
    } else {
      console.warn("Invalid weakId selected:", weakId);
    }
  };

  // --- Run Evolution ---
  for (let generation = 0; generation < generations; generation++) {
    // Check for convergence (optional)
    const bestCurrentFitness = population.reduce(
      (max, ind) => Math.max(max, ind.fitness),
      0,
    );
    if (bestCurrentFitness >= 99) {
      // console.log(`Converged early at generation ${generation}`);
      break; // Stop if a very good match is found
    }
    if (totalFitness <= 0 && generation > 0) {
      // console.log(`Population fitness collapsed at generation ${generation}`);
      // Re-initialize part of the population if stuck? Or just break.
      break;
    }

    // Select parents
    let parentId1 = chooseFit();
    let parentId2 = chooseFit();
    // Ensure parents are different
    while (parentId1 === parentId2 && populationSize > 1) {
      parentId2 = chooseFit();
    }

    const parent1 = population[parentId1];
    const parent2 = population[parentId2];

    // Breed and mutate
    const child = breed(parent1, parent2);
    const mutatedChild = mutate(child); // Mutate the child

    // Replace a weak individual
    replaceWeak(mutatedChild);
  }

  // --- Return Best Result ---
  let bestIndividual = population[0];
  for (let i = 1; i < populationSize; i++) {
    if (population[i].fitness > bestIndividual.fitness) {
      bestIndividual = population[i];
    }
  }

  return bestIndividual.color;
}
