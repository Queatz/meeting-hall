import {
  AbstractMesh,
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3
} from '@babylonjs/core'
import { World } from "./world";

export class Sky {

  skybox!: Mesh

  constructor(private world: World, private scene: Scene) {
    this.skybox = MeshBuilder.CreateSphere('skyBox', { diameter: scene.activeCamera!.maxZ * 0.9, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene)
    this.skybox.applyFog = false
    const skyboxMaterial = new StandardMaterial('skyBox', scene)
    skyboxMaterial.emissiveTexture = new Texture('assets/skybox-dusk.png', scene, undefined, false, Texture.NEAREST_SAMPLINGMODE)
    // skyboxMaterial.emissiveColor = scene.ambientColor.scale(.125)
    skyboxMaterial.disableLighting = true
    skyboxMaterial.diffuseColor = scene.ambientColor
    skyboxMaterial.specularColor = Color3.Black()
    this.skybox.material = skyboxMaterial

    // this.world.addOutlineMesh(this.skybox)
  }

  update() {
    if (this.scene.deltaTime) {
      this.skybox.rotateAround(Vector3.Zero(), Vector3.Up(), this.scene.deltaTime * 0.0000125)
    }

    this.skybox.position.copyFrom(this.scene.activeCamera!.position)
  }
}
