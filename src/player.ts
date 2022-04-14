import { World} from "./world";
import {
  AbstractMesh,
  AnimationGroup,
  Mesh,
  PBRMaterial,
  Quaternion, Ray,
  Scene,
  SceneLoader,
  Skeleton,
  Vector3
} from "@babylonjs/core";
import { PlayerInput} from "./input";

export class Player {

  player!: AbstractMesh

  private input = new PlayerInput(this.scene)
  private skeleton!: Skeleton
  private playerAnimations!: Array<AnimationGroup>
  private playerAnimation = 'Idle'
  private idleWeight = 1
  private walkWeight = 0
  private runWeight = 0

  get ready() {
    return !!this.player
  }

  constructor(private world: World, private scene: Scene) {
    SceneLoader.ImportMeshAsync('', '/assets/', 'girl.glb', scene).then(result => {
      this.player = result.meshes[0]

      this.player.position.y += 1
      this.player.position.x += 3
      this.player.position.z += 140

      this.player.collisionRetryCount = 5
      this.player.ellipsoidOffset = new Vector3(0, 1.05, 0)

      const target = new Mesh('Camera Target')
      target.setParent(this.player)
      target.position.y = 2
      target.position.x = 0
      target.position.z = 0

      this.world.camera.setTarget(target)
      this.world.camera.setPosition(this.player.position.add(new Vector3(0, 3, -6)))

      this.skeleton = result.skeletons[0]!
      this.playerAnimations = result.animationGroups

      result.meshes.forEach(mesh => {
        this.world.mirror.renderList!.push(mesh)
        // mesh.alphaIndex = 0

        if (mesh.material instanceof PBRMaterial) {
          mesh.material.specularIntensity = Math.min(mesh.material.specularIntensity, .1)
        }

        this.world.shadowGenerator.addShadowCaster(mesh)

        try {
          mesh.receiveShadows = true
        } catch (ignored) {}
      })
    })
  }

  update() {
    const s = 0.005 * this.scene.deltaTime * (this.input.key('Shift') || this.input.button(2) ? 1 : 0.5)

    let x = 0, z = 0

    if (this.input.key('w') || this.input.button(0) || this.input.button(2)) {
      z = s
    }

    if (this.input.key('a')) {
      x = -s
    }

    if (this.input.key('s')) {
      z = -s
    }

    if (this.input.key('d')) {
      x = s
    }

    if (x !== 0 && z !== 0) {
      x = x * Math.sqrt(1)
      z = z * Math.sqrt(1)
    }

    if (x !== 0 || z !== 0) {
      const forward = this.world.camera.getDirection(Vector3.Forward()).multiply(new Vector3(1, 0, 1)).normalize().scale(z)
      const right = this.world.camera.getDirection(Vector3.Right()).multiply(new Vector3(1, 0, 1)).normalize().scale(x)
      const movement = forward.add(right)

      this.player.rotationQuaternion = Quaternion.Slerp(this.player.rotationQuaternion!, Quaternion.FromLookDirectionLH(movement.normalizeToNew(), this.player.up), .125)
      this.player.moveWithCollisions(movement)

      this.playerAnimation = this.input.key('Shift') || this.input.button(2) ? 'Run' : 'Walk'
    } else {
      this.playerAnimation = 'Idle'
    }

    const run = this.playerAnimations.find(x => x.name === 'Run')!
    const walk = this.playerAnimations.find(x => x.name === 'Walk')!
    const idle = this.playerAnimations.find(x => x.name === 'Idle')!

    const as = 0.0125

    if (this.playerAnimation === 'Run') {
      if (run.isPlaying) {
        if (this.runWeight < 1) {
          this.runWeight += Math.min(this.scene.deltaTime * as, 1)
          run.setWeightForAllAnimatables(this.runWeight)
        }
      } else {
        this.runWeight = 0
        run.start(true)
        run.setWeightForAllAnimatables(this.runWeight)
      }

      if (walk.isPlaying) {
        if (this.walkWeight > 0) {
          this.walkWeight -= Math.max(this.scene.deltaTime * as, 0)

          if (this.walkWeight === 0) {
            walk.stop()
          } else {
            walk.setWeightForAllAnimatables(this.walkWeight)
          }
        }
      }

      if (idle.isPlaying) {
        if (this.idleWeight > 0) {
          this.idleWeight -= Math.max(this.scene.deltaTime * as, 0)

          if (this.idleWeight === 0) {
            idle.stop()
          } else {
            idle.setWeightForAllAnimatables(this.idleWeight)
          }
        }
      }
    } else if (this.playerAnimation === 'Walk') {
      if (walk.isPlaying) {
        if (this.walkWeight < 1) {
          this.walkWeight += Math.min(this.scene.deltaTime * as, 1)
          walk.setWeightForAllAnimatables(this.walkWeight)
        }
      } else {
        this.walkWeight = 0
        walk.start(true)
        walk.setWeightForAllAnimatables(this.walkWeight)
      }

      if (idle.isPlaying) {
        if (this.idleWeight > 0) {
          this.idleWeight -= Math.max(this.scene.deltaTime * as, 0)

          if (this.idleWeight === 0) {
            idle.stop()
          } else {
            idle.setWeightForAllAnimatables(this.idleWeight)
          }
        }
      }

      if (run.isPlaying) {
        if (this.runWeight > 0) {
          this.runWeight -= Math.max(this.scene.deltaTime * as, 0)

          if (this.runWeight === 0) {
            run.stop()
          } else {
            run.setWeightForAllAnimatables(this.runWeight)
          }
        }
      }
    } else if (this.playerAnimation === 'Idle') {
      if (idle.isPlaying) {
        if (this.idleWeight < 1) {
          this.idleWeight += Math.min(this.scene.deltaTime * as, 1)
          idle.setWeightForAllAnimatables(this.idleWeight)
        }
      } else {
        this.idleWeight = 0
        idle.start(true)
        idle.setWeightForAllAnimatables(this.idleWeight)
      }

      if (walk.isPlaying) {
        if (this.walkWeight > 0) {
          this.walkWeight -= Math.max(this.scene.deltaTime * as, 0)

          if (this.walkWeight === 0) {
            walk.stop()
          } else {
            walk.setWeightForAllAnimatables(this.walkWeight)
          }
        }
      }

      if (run.isPlaying) {
        if (this.runWeight > 0) {
          this.runWeight -= Math.max(this.scene.deltaTime * as, 0)

          if (this.runWeight === 0) {
            run.stop()
          } else {
            run.setWeightForAllAnimatables(this.runWeight)
          }
        }
      }
    }

    const gravity = new Ray(this.player.position, Vector3.Up()).intersectsMesh(this.world.ground)

    if (!gravity.hit) {
      this.player.moveWithCollisions(new Vector3(0, -0.005 * this.scene.deltaTime, 0))
    }

    const ray = new Ray(this.player.position, Vector3.Up()).intersectsMesh(this.world.ground)

    if (ray.hit) {
      this.player.position.y = ray.pickedPoint!.y
    }
  }
}
