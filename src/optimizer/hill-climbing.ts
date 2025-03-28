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

export function hillClimbingOptimization(
  primaryColorRGB: number[],
  maxIterations: number = 1000,
  patience: number = 50,
): {
  solution: Solution;
  iterations: number;
  fitnessHistory: number[];
} {
  let solution = seedInitialSolution();
  let localPatience = 0;
  let fitnessHistory: number[] = [];
  let iteration = 0;

  for (; iteration < maxIterations; iteration++) {
    const currentFitness = evaluateSolution(primaryColorRGB, solution);
    fitnessHistory.push(currentFitness);

    const neighbours = computeNeighbours(solution);
    let bestNeighbourFitness = currentFitness;
    let bestMove: Move | null = null;

    for (const move of neighbours) {
      const neighbourSolution = [...solution];
      neighbourSolution[move.idx] += move.change;
      const neighbourFitness = evaluateSolution(
        primaryColorRGB,
        neighbourSolution,
      );

      if (neighbourFitness > bestNeighbourFitness) {
        bestNeighbourFitness = neighbourFitness;
        bestMove = move;
      }
    }

    if (!bestMove) {
      if (localPatience >= patience) break;
      localPatience++;
      continue;
    }

    localPatience = 0;
    solution[bestMove.idx] += bestMove.change;
  }

  return {
    solution,
    iterations: iteration,
    fitnessHistory,
  };
}
