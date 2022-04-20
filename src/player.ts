import { World } from './world'
import {
  AbstractMesh,
  Mesh,
  PBRMaterial,
  Quaternion, Ray,
  Scene,
  SceneLoader,
  Skeleton,
  Vector3
} from '@babylonjs/core'
import { PlayerInput } from './input'
import { Animations } from './animations'
import { Ui } from './ui'

export class Player {

  player!: AbstractMesh

  private input = new PlayerInput(this.scene)
  private skeleton!: Skeleton

  private playerAnimations = new Animations()

  get ready() {
    return !!this.player
  }

  constructor(private world: World, private scene: Scene, private ui: Ui) {
    SceneLoader.ImportMeshAsync('', '/assets/', 'girl.glb', scene).then(result => {
      this.player = result.meshes[0]

      this.player.position.copyFrom(this.world.startingPoint)

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
      this.playerAnimations.load(result.animationGroups)

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
    if (this.input.key('Escape')) {
      this.player.position.copyFrom(this.world.startingPoint)
    }

    const run = this.input.key('Shift') || (!this.ui.blockPointer && this.input.button(2))
    const s = 0.005 * this.scene.deltaTime * (this.input.key('q') ? 10 : run ? 1 : 0.5)

    let x = 0, z = 0

    if (this.input.key('w') || (!this.ui.blockPointer && (this.input.button(0) || this.input.button(2)))) {
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

      this.playerAnimations.set(run ? 'Run' : 'Walk')
    } else {
      this.playerAnimations.set('Idle')
    }

    this.playerAnimations.update(this.scene.deltaTime)

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
