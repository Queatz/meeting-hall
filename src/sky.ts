import {
  Color3,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  Texture,
  Vector3
} from '@babylonjs/core'
import { World } from "./world";

export class Sky {

  skybox!: Mesh

  constructor(private world: World, private scene: Scene) {
    this.skybox = MeshBuilder.CreateSphere('skyBox', { diameter: scene.activeCamera!.maxZ * 0.9, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene)
    this.skybox.applyFog = false
    const skyboxMaterial = new PBRMaterial('skyBox', scene)
    skyboxMaterial.emissiveTexture = new Texture('assets/skybox.png', scene, undefined, false, Texture.NEAREST_SAMPLINGMODE)
    skyboxMaterial.emissiveColor = new Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b)
    skyboxMaterial.emissiveIntensity = 1.1
    skyboxMaterial.disableLighting = true
    skyboxMaterial.directIntensity = 0
    skyboxMaterial.specularIntensity = 0
    this.skybox.material = skyboxMaterial

    // this.skybox.isVisible = false

    // this.world.addOutlineMesh(this.skybox)
  }

  update() {
    if (this.scene.deltaTime) {
      this.skybox.rotateAround(Vector3.Zero(), Vector3.Up(), this.scene.deltaTime * 0.0000125)
    }

    this.skybox.position.copyFrom(this.scene.activeCamera!.position)
  }
}
