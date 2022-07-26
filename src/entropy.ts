import * as randn from '@stdlib/random-base-uniform'

export class Entropy {

  private readonly data!: Array<number>

  constructor(private scale = 1, seed = 1) {
    const rnd = randn.factory({ seed })
    this.data = new Array(256).fill(0).map(() => rnd(0, 1))
  }

  sample(x: number, z: number): number {
    const origin = [
      Math.floor(x / this.scale),
      Math.floor(z / this.scale)
    ]

    const factor = [
      x / this.scale - origin[0],
      z / this.scale - origin[1]
    ]

    const values = [
      this.sampleRaw(origin[0], origin[1]),
      this.sampleRaw(origin[0] + 1, origin[1]),
      this.sampleRaw(origin[0], origin[1] + 1),
      this.sampleRaw(origin[0] + 1, origin[1] + 1)
    ]

    let root!: number

    if (factor[0] + factor[1] > 1) {
      [factor[0], factor[1]] = [1 - factor[1], 1 - factor[0]]
      root = values[3]
    } else {
      root = values[0]
    }

    return root * (1 - (factor[0] + factor[1])) +
      values[1] * factor[0] +
      values[2] * factor[1]
  }

  private sampleRaw(x: number, z: number): number {
    return this.data[Math.floor(((x + 230 * 902) * (z + 332 * 493) * 435) % this.data.length)]
  }
}
