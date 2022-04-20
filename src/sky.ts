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

export class Sky {

  skybox!: AbstractMesh

  constructor(private scene: Scene) {
    this.skybox = MeshBuilder.CreateSphere('skyBox', { diameter: 900, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene)
    this.skybox.applyFog = false
    const skyboxMaterial = new StandardMaterial('skyBox', scene)
    skyboxMaterial.emissiveTexture = new Texture('assets/skybox.png', scene, undefined, false, Texture.NEAREST_SAMPLINGMODE)
    skyboxMaterial.emissiveTexture.coordinatesMode = Texture.EQUIRECTANGULAR_MODE
    skyboxMaterial.disableLighting = true
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0)
    skyboxMaterial.specularColor = new Color3(0, 0, 0)
    this.skybox.material = skyboxMaterial
  }

  update() {
    if (this.scene.deltaTime)
    this.skybox.rotateAround(Vector3.Zero(), Vector3.Up(), this.scene.deltaTime * 0.0000125)
  }
}
