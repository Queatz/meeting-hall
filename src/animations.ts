import { AnimationGroup } from '@babylonjs/core'

export class Animations {
  private animations: Array<AnimationGroup> = []
  private current?: AnimationGroup
  private weights = new Map<string, number>()

  private speed = 0.0125

  load(animationGroups: Array<AnimationGroup>) {
    this.animations.push(...animationGroups)
  }

  set(animation?: string) {
    this.current = this.animations.find(x => x.name === animation)
  }

  update(deltaTime: number) {
    this.animations.forEach(anim => {
      if (this.current === anim) {
        if (anim.isPlaying) {
          if (this.weights.get(anim.name) || 0 < 1) {
            const w = Math.min((this.weights.get(anim.name) || 0) + (deltaTime * this.speed), 1)
            this.weights.set(anim.name, w)
            anim.setWeightForAllAnimatables(w)
          }
        } else {
          const w = deltaTime * this.speed
          this.weights.set(anim.name, w)
          anim.start(true)
          anim.setWeightForAllAnimatables(w)
        }
      } else {
        if (anim.isPlaying && this.weights.get(anim.name) || 0 > 0) {
          const w = Math.max((this.weights.get(anim.name) || 0) - (deltaTime * this.speed), 0)
          this.weights.set(anim.name, w)

          if (w === 0) {
            anim.stop()
          } else {
            anim.setWeightForAllAnimatables(w)
          }
        }
      }
    })
  }
}
