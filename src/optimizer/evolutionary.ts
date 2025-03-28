interface RGB {
  R: number;
  G: number;
  B: number;
}

class Colour {
  R: number;
  G: number;
  B: number;
  fitness: number;
  private targetColor: RGB;

  constructor(targetColor: RGB, R?: number, G?: number, B?: number) {
    this.targetColor = targetColor;
    this.R = (typeof R === "undefined") ? randomInt(0, 255) : R;
    this.G = (typeof G === "undefined") ? randomInt(0, 255) : G;
    this.B = (typeof B === "undefined") ? randomInt(0, 255) : B;
    this.fitness = 0;
    this.setFitness();
  }

  setFitness() {
    const dR = this.R - this.targetColor.R;
    const dG = this.G - this.targetColor.G;
    const dB = this.B - this.targetColor.B;
    const distance = Math.round(Math.sqrt(dR * dR + dG * dG + dB * dB));
    this.fitness = Math.round((442 - distance) / 442 * 100);
  }
}

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1) + min);

const randomBool = (chance: number = 0.5): boolean => Math.random() < chance;

export function evolveColor(targetColor: RGB, generations: number = 1000): RGB {
  const population: Colour[] = [];
  let totalFitness = 0;

  // Initialize population
  for (let i = 0; i < 100; i++) {
    population[i] = new Colour(targetColor);
    totalFitness += population[i].fitness;
  }

  const chooseFit = (): number => {
    let number = randomInt(0, totalFitness - 1);
    for (let i = 0; i < 100; i++) {
      if (population[i].fitness > number) {
        return i;
      } else {
        number -= population[i].fitness;
      }
    }
    return 0;
  };

  const chooseWeak = (): number => {
    let number = randomInt(0, 9999 - totalFitness);
    for (let i = 0; i < 100; i++) {
      const weakness = 100 - population[i].fitness;
      if (weakness > number) {
        return i;
      } else {
        number -= weakness;
      }
    }
    return 0;
  };

  const mutate = (colour: Colour) => {
    if (randomBool(0.01)) colour.R = randomInt(0, 255);
    if (randomBool(0.01)) colour.G = randomInt(0, 255);
    if (randomBool(0.01)) colour.B = randomInt(0, 255);
  };

  const chooseParents = (): [Colour, Colour] => {
    let parentId1 = 0;
    let parentId2 = 0;
    while (parentId1 === parentId2) {
      parentId1 = chooseFit();
      parentId2 = chooseFit();
    }
    return [population[parentId1], population[parentId2]];
  };

  const breed = (parent1: Colour, parent2: Colour): Colour => {
    const R = randomBool() ? parent1.R : parent2.R;
    const G = randomBool() ? parent1.G : parent2.G;
    const B = randomBool() ? parent1.B : parent2.B;
    return new Colour(targetColor, R, G, B);
  };

  const replaceWeak = (child: Colour) => {
    const weakId = chooseWeak();
    const deceased = population[weakId];
    totalFitness += child.fitness - deceased.fitness;
    population[weakId] = child;
  };

  // Run evolution
  for (let generation = 0; generation < generations; generation++) {
    if (totalFitness === 10000) break;

    const parents = chooseParents();
    const child = breed(parents[0], parents[1]);
    mutate(child);
    replaceWeak(child);
  }

  // Return best result
  let bestFitness = 0;
  let bestColor = population[0];

  population.forEach((color) => {
    if (color.fitness > bestFitness) {
      bestFitness = color.fitness;
      bestColor = color;
    }
  });

  return {
    R: bestColor.R,
    G: bestColor.G,
    B: bestColor.B,
  };
}
