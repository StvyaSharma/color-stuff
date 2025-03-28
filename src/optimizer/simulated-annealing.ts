import { evaluateSolution, seedInitialSolution } from "./utils.ts";

type Solution = number[];
type Move = { idx: number; change: number };

function computeNeighbours(solution: Solution): Move[] {
  const neighbours: Move[] = [];
  for (let i = 0; i < solution.length; i++) {
    if (solution[i] < 245) {
      neighbours.push({ idx: i, change: 10 });
    }
    if (solution[i] > 10) {
      neighbours.push({ idx: i, change: -10 });
    }
  }
  return neighbours;
}

export function simulatedAnnealingOptimization(
  primaryColorRGB: number[],
  maxIterations: number = 1000,
  patience: number = 50,
  decayRate: number = 90,
): {
  solution: Solution;
  iterations: number;
  fitnessHistory: number[];
  temperatureHistory: number[];
} {
  let solution = seedInitialSolution();
  let temperature = 1;
  let localPatience = 0;
  let fitnessHistory: number[] = [];
  let temperatureHistory: number[] = [];
  let iteration = 0;

  for (; iteration < maxIterations; iteration++) {
    const currentFitness = evaluateSolution(primaryColorRGB, solution);
    fitnessHistory.push(currentFitness);
    temperatureHistory.push(temperature);

    const neighbours = computeNeighbours(solution);
    const randomNeighbour =
      neighbours[Math.floor(Math.random() * neighbours.length)];

    const neighbourSolution = [...solution];
    neighbourSolution[randomNeighbour.idx] += randomNeighbour.change;
    const neighbourFitness = evaluateSolution(
      primaryColorRGB,
      neighbourSolution,
    );

    let acceptMove = false;
    if (neighbourFitness >= currentFitness) {
      acceptMove = true;
    } else if (temperature > 0.001) {
      const acceptanceProbability = Math.exp(
        (-1 * Math.abs(neighbourFitness - currentFitness)) / temperature,
      );
      acceptMove = Math.random() <= acceptanceProbability;
    }

    if (acceptMove) {
      solution = neighbourSolution;
      localPatience = 0;
    } else {
      if (localPatience >= patience) break;
      localPatience++;
    }

    if (temperature >= 0.001) {
      temperature *= decayRate / 100;
    }
  }

  return {
    solution,
    iterations: iteration,
    fitnessHistory,
    temperatureHistory,
  };
}
