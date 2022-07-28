import * as randn from '@stdlib/random-base-uniform'
import { Vector2 } from "@babylonjs/core";

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

    // todo convert these to Vector2
    const factor = [
      x / this.scale - origin[0],
      z / this.scale - origin[1]
    ]

    const dots = [
      this.sampleDot(origin[0], origin[1]),
      this.sampleDot(origin[0] + 1, origin[1]),
      this.sampleDot(origin[0], origin[1] + 1),
      this.sampleDot(origin[0] + 1, origin[1] + 1)
    ].map(x => new Vector2(Math.cos(x), Math.sin(x)))

    const mix = (a: number, b: number, v: number) => (a * (1 - v) + b * v)
    const smootherstep = (x: number) => Math.max(0, Math.min(1, x * x * x * (x * (x * 6 - 15) + 10)))
    const gradient = (x: number, y: number, a: Vector2) => (x * a.x + y * a.y) // todo use Vector2.Dot

    return (mix(
      mix(
        gradient(factor[0], factor[1], dots[0]),
        gradient(-(1 - factor[0]), factor[1], dots[1]),
        smootherstep(factor[0])
      ),
      mix(
        gradient(factor[0], -(1 - factor[1]), dots[2]),
        gradient(-(1 - factor[0]), -(1 - factor[1]), dots[3]),
        smootherstep(factor[0])
      ),
      smootherstep(factor[1])
    ) + Math.SQRT1_2) / Math.SQRT2
  }

  private sampleRaw(x: number, z: number): number {
    return this.data[Math.floor(((x + 230 * 902) * (z + 332 * 493) * 435) % this.data.length)]
  }

  private sampleDot(x: number, z: number): number {
    return this.data[Math.floor(((x + 938 * 385) * (z + 837 * 183) * 927) % this.data.length)] * Math.PI * 2
  }

}
