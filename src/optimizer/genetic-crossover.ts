import { evaluateSolution, seedInitialSolution } from "./utils.ts";

type Solution = number[];
type Parents = [Solution, Solution];
type CrossoverOperation =
  | "one-point"
  | "two-point"
  | "block"
  | "uniform"
  | "shuffle";

function selectParents(
  population: Solution[],
  populationEvals: number[],
): Parents {
  // Sort population evaluations and keep track of original indices
  const sortedPopEvalsIdx = populationEvals
    .map((val, idx) => ({ val, idx }))
    .sort((a, b) => b.val - a.val)
    .map(({ idx }) => idx);

  // Calculate ranks
  const ranks = Array(population.length).fill(1);
  let currentRank = 1;
  for (let i = 1; i < populationEvals.length; i++) {
    if (
      populationEvals[sortedPopEvalsIdx[i]] !==
        populationEvals[sortedPopEvalsIdx[i - 1]]
    ) {
      currentRank++;
    }
    ranks[sortedPopEvalsIdx[i]] = currentRank;
  }

  // Calculate selection probabilities
  const totalRanks = ranks.reduce((a, b) => a + b, 0);
  const probs = ranks.map((rank) => (totalRanks - rank) / totalRanks);

  // Select parents
  const selectedParentsIdx: number[] = [];
  for (let i = 0; i < 2; i++) {
    const rand = Math.random();
    let idx = 0;
    let acc = probs[0];
    while (acc < rand && idx < probs.length - 1) {
      idx++;
      acc += probs[idx];
    }
    selectedParentsIdx.push(idx);
  }

  return [population[selectedParentsIdx[0]], population[selectedParentsIdx[1]]];
}

function performCrossoverAndMutation(
  parents: Parents,
  crossoverProbability: number,
  mutationProbability: number,
  crossoverOperation: CrossoverOperation = "uniform",
): [Solution, Solution] {
  let [offspring1, offspring2] = [[], []] as [Solution, Solution];

  if (Math.random() <= crossoverProbability / 100) {
    switch (crossoverOperation) {
      case "uniform":
        for (let i = 0; i < parents[0].length; i += 3) {
          if (Math.random() < 0.5) {
            offspring1.push(...parents[0].slice(i, i + 3));
            offspring2.push(...parents[1].slice(i, i + 3));
          } else {
            offspring1.push(...parents[1].slice(i, i + 3));
            offspring2.push(...parents[0].slice(i, i + 3));
          }
        }
        break;
        // Implement other crossover operations as needed
    }
  } else {
    offspring1 = [...parents[0]];
    offspring2 = [...parents[1]];
  }

  // Mutation
  const mutate = (gene: number): number => {
    if (Math.random() <= mutationProbability / 100) {
      const mutationType = Math.floor(Math.random() * 2);
      if (mutationType === 0) {
        gene += Math.floor(Math.random() * 41) - 20;
      } else {
        gene = Math.floor(Math.random() * 256);
      }
      return Math.max(0, Math.min(255, gene));
    }
    return gene;
  };

  offspring1 = offspring1.map(mutate);
  offspring2 = offspring2.map(mutate);

  return [offspring1, offspring2];
}

export function geneticCrossoverOptimization(
  primaryColorRGB: number[],
  populationSize: number = 10,
  maxIterations: number = 1000,
  crossoverProbability: number = 70,
  mutationProbability: number = 10,
  thresholdFitness: number = 80,
  crossoverOperation: CrossoverOperation = "uniform",
): {
  population: Solution[];
  iterations: number;
  fitnessHistory: number[][];
} {
  let population = Array.from({ length: populationSize }, seedInitialSolution);
  let fitnessHistory: number[][] = [];
  let iteration = 0;

  for (; iteration < maxIterations; iteration++) {
    const populationEvals = population.map((solution) =>
      evaluateSolution(primaryColorRGB, solution)
    );

    fitnessHistory.push([...populationEvals]);

    if (populationEvals.every((fitness) => fitness >= thresholdFitness)) {
      break;
    }

    const parents = selectParents(population, populationEvals);
    const [offspring1, offspring2] = performCrossoverAndMutation(
      parents,
      crossoverProbability,
      mutationProbability,
      crossoverOperation,
    );

    // Replace worst performing solutions
    const worstIndices = populationEvals
      .map((val, idx) => ({ val, idx }))
      .sort((a, b) => a.val - b.val)
      .slice(0, 2)
      .map(({ idx }) => idx);

    population[worstIndices[0]] = offspring1;
    population[worstIndices[1]] = offspring2;
  }

  return {
    population,
    iterations: iteration,
    fitnessHistory,
  };
}
