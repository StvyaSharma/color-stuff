/**
 * @file utils/noise.ts
 * Provides a Simplex Noise generator class.
 * Adapted from various public domain implementations. Useful for procedural generation.
 * @see https://weber.itn.liu.se/~stegu/simplexnoise/simplexnoise.pdf
 */
import Seedrandom from "seedrandom"; // Use Seedrandom for seeding

/**
 * Mulberry32 pseudo-random number generator for internal seeding if needed.
 * @param a - Seed value.
 * @returns A function that generates random numbers between 0 (inclusive) and 1 (exclusive).
 * @private
 */
function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gradient vectors for 2D, 3D, and 4D noise
// Constants for calculations
const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
const F3 = 1.0 / 3.0;
const G3 = 1.0 / 6.0;

// Gradient vectors for 3D (pointing to edges and vertices of cube)
const grad3 = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
];

// Helper function for dot product
function dot2D(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}
function dot3D(g: number[], x: number, y: number, z: number): number {
  return g[0] * x + g[1] * y + g[2] * z;
}

/**
 * Simplex Noise implementation for 2D and 3D noise generation.
 * Can be seeded for reproducible results.
 */
export class SimplexNoise {
  private p: number[] = []; // Permutation table doubled
  private perm: number[] = []; // Permutation table (0-255)
  private permMod12: number[] = []; // p[i] % 12, used for gradient indexing

  /**
   * Initializes the Simplex Noise generator.
   * @param seed - An optional seed (string or number) for the random number generator. Uses Date.now() if undefined.
   */
  constructor(seed?: string | number | (() => number)) {
    let randomFunc: () => number;
    if (typeof seed === "function") {
      randomFunc = seed; // Use provided RNG function
    } else if (seed !== undefined) {
      // Use Seedrandom if a seed value is given
      randomFunc = Seedrandom(String(seed));
    } else {
      // Default to Math.random or Mulberry32 if Seedrandom isn't available or desired
      randomFunc = Math.random; // Or mulberry32(Date.now());
    }

    // Initialize permutation table
    for (let i = 0; i < 256; i++) {
      this.perm[i] = i;
    }

    // Shuffle using Fisher-Yates
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(randomFunc() * (i + 1));
      [this.perm[i], this.perm[j]] = [this.perm[j], this.perm[i]];
    }

    // Double the permutation table and calculate permMod12
    this.p = this.perm.concat(this.perm);
    this.permMod12 = this.p.map((val) => val % 12);
  }

  /**
   * Generates 2D Simplex noise for the given coordinates.
   * @param x - X coordinate.
   * @param y - Y coordinate.
   * @returns Noise value in the range [-1, 1].
   */
  public noise2D(x: number, y: number): number {
    let n0 = 0, n1 = 0, n2 = 0; // Contributions from the three corners

    // Skew the input space to determine which simplex cell we're in
    const s = (x + y) * F2; // Hairy factor for 2D
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const t = (i + j) * G2;
    const X0 = i - t; // Unskewed grid cell origin
    const Y0 = j - t;
    const x0 = x - X0; // Coordinates relative to grid cell origin
    const y0 = y - Y0;

    // Determine which simplex we are in
    let i1: number, j1: number; // Offsets for second corner of simplex in (i,j) coords
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } // Lower triangle, XY order: (0,0)->(1,0)->(1,1)
    else {
      i1 = 0;
      j1 = 1;
    } // Upper triangle, XY order: (0,0)->(0,1)->(1,1)

    // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
    // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where c = (3-sqrt(3))/6
    const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
    const y2 = y0 - 1.0 + 2.0 * G2;

    // Work out the hashed gradient indices of the three simplex corners
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.permMod12[ii + this.p[jj]]; // Grad index for origin
    const gi1 = this.permMod12[ii + i1 + this.p[jj + j1]]; // Grad index for middle corner
    const gi2 = this.permMod12[ii + 1 + this.p[jj + 1]]; // Grad index for last corner

    // Calculate the contribution from the three corners
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * dot2D(grad3[gi0], x0, y0); // (x,y) of grad3 used for 2D gradient
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * dot2D(grad3[gi1], x1, y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * dot2D(grad3[gi2], x2, y2);
    }

    // Add contributions from each corner to get the final noise value.
    // The result is scaled to return values in the interval [-1, 1].
    return 70.0 * (n0 + n1 + n2);
  }

  /**
   * Generates 3D Simplex noise for the given coordinates.
   * @param x - X coordinate.
   * @param y - Y coordinate.
   * @param z - Z coordinate.
   * @returns Noise value in the range [-1, 1].
   */
  public noise3D(x: number, y: number, z: number): number {
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0; // Contributions from the four corners

    // Skew the input space to determine which simplex cell we're in
    const s = (x + y + z) * F3; // Factor for 3D
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    const t = (i + j + k) * G3;
    const X0 = i - t; // Unskewed grid cell origin
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0; // Coordinates relative to grid cell origin
    const y0 = y - Y0;
    const z0 = z - Z0;

    // Determine which simplex we are in
    let i1: number, j1: number, k1: number; // Offsets for second corner of simplex in (i,j,k) coords
    let i2: number, j2: number, k2: number; // Offsets for third corner of simplex in (i,j,k) coords

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } // X Y Z order
      else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } // X Z Y order
      else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } // Z X Y order
    } else { // x0 < y0
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } // Z Y X order
      else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } // Y Z X order
      else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } // Y X Z order
    }

    // Calculate coordinates relative to the other three corners of the simplex
    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    // Work out the hashed gradient indices of the four simplex corners
    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;
    const gi0 = this.permMod12[ii + this.p[jj + this.p[kk]]];
    const gi1 = this.permMod12[ii + i1 + this.p[jj + j1 + this.p[kk + k1]]];
    const gi2 = this.permMod12[ii + i2 + this.p[jj + j2 + this.p[kk + k2]]];
    const gi3 = this.permMod12[ii + 1 + this.p[jj + 1 + this.p[kk + 1]]];

    // Calculate the contribution from the four corners
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * dot3D(grad3[gi0], x0, y0, z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * dot3D(grad3[gi1], x1, y1, z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * dot3D(grad3[gi2], x2, y2, z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      t3 *= t3;
      n3 = t3 * t3 * dot3D(grad3[gi3], x3, y3, z3);
    }

    // Add contributions from each corner to get the final noise value.
    // The result is scaled to stay just inside [-1,1]
    return 32.0 * (n0 + n1 + n2 + n3);
  }
}
