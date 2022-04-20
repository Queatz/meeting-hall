import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  ArcRotateCameraMouseWheelInput,
  CascadedShadowGenerator,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MirrorTexture,
  NodeMaterial,
  PBRMaterial,
  Plane,
  Ray,
  ReflectionBlock,
  Scene,
  SceneLoader,
  Texture,
  TextureBlock,
  TransformNode,
  Vector3
} from '@babylonjs/core'
import { Sky } from './sky'
import { PostProcess } from './postProcess'
import { Player } from './player'
import { ISceneLoaderAsyncResult } from '@babylonjs/core'

export class World {

  ground!: AbstractMesh
  water!: AbstractMesh
  camera: ArcRotateCamera
  shadowGenerator: CascadedShadowGenerator
  mirror: MirrorTexture
  startingPoint: Vector3 = new Vector3(3, 1, 140)

  private skybox: Sky
  private postProcess: PostProcess
  private clearColor: Color4

  private player!: Player
  private meshes!: Array<AbstractMesh>;

  get ready() {
    return !!this.ground && this.player?.ready
  }

  constructor(private scene: Scene, engine: Engine, canvas: HTMLCanvasElement) {
    scene.fogMode = Scene.FOGMODE_EXP2
    scene.fogDensity = 0.0025
    scene.fogStart = 500
    scene.fogEnd = 1000
    scene.clearColor = new Color4(.5, .667, 1)
    scene.clearColor = new Color4(.667, .822, 1)
    scene.clearColor = new Color4(1, 1, 1, 0)
    // scene.clearColor = new Color4(1, .7, .5) // evening
    scene.ambientColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)
    scene.fogColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)

    this.clearColor = scene.clearColor

    this.camera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene)
    this.camera.attachControl(canvas, true)
    this.camera.upperRadiusLimit = 10
    this.camera.lowerRadiusLimit = 1
    this.camera.fov = 1.333
    this.camera.minZ = 0.1
    this.camera.maxZ = 1000
    ;(this.camera.inputs.attached['mousewheel'] as ArcRotateCameraMouseWheelInput).wheelPrecision = 64

    const light1: HemisphericLight = new HemisphericLight('light1', new Vector3(1, 1, 0), scene)
    light1.specular = Color3.Black()
    light1.diffuse = scene.ambientColor
    light1.intensity = .6
    const sun: DirectionalLight = new DirectionalLight('Sun', new Vector3(-.75, -.5, 0).normalize(), scene)
    sun.intensity = 1.2
    sun.shadowMinZ = this.camera.minZ
    sun.shadowMaxZ = this.camera.maxZ

    this.skybox = new Sky(scene)
    this.postProcess =  new PostProcess(scene, this.camera, engine, sun.direction, [ this.skybox.skybox ])

    this.shadowGenerator = new CascadedShadowGenerator(1024 * .75, sun)
    this.shadowGenerator.transparencyShadow = true
    // this.shadowGenerator.enableSoftTransparentShadow = true
    // this.shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_LOW
    this.shadowGenerator.lambda = .9
    this.shadowGenerator.bias = .005
    this.shadowGenerator.normalBias = .05
    this.shadowGenerator.stabilizeCascades = true
    this.shadowGenerator.shadowMaxZ = this.camera.maxZ / 2
    this.shadowGenerator.splitFrustum()

    this.mirror = new MirrorTexture('main', 1024, scene, true)
    this.mirror.level = 1
    this.mirror.renderList!.push(this.skybox.skybox)

    SceneLoader.ImportMeshAsync('', '/assets/', 'forest.glb', scene).then((result: ISceneLoaderAsyncResult) => {
      this.player = new Player(this, scene)

      this.ground = result.meshes.find((x: AbstractMesh) => x.name === 'Plane.015')! // Ground

      const startingPoint = result.transformNodes.find((x: TransformNode) => x.name === 'Starting point')

      if (startingPoint) {
        this.startingPoint.copyFrom(startingPoint.position)
      }

      result.animationGroups.forEach((anim: AnimationGroup) => {
        anim.start(true)
      })

      this.meshes = result.meshes

      result.meshes.forEach((mesh: AbstractMesh) => {
        if (mesh.name === 'Plane.001') { // water
          this.water = mesh

          NodeMaterial.ParseFromFileAsync("Water", "assets/water.json", scene).then((material: NodeMaterial) => {
            material.backFaceCulling = false

            const normalMap = material.getBlockByName('Texture') as TextureBlock
            const reflection = material.getBlockByName('Reflection') as ReflectionBlock
            normalMap.texture = new Texture('assets/waterbump.png', scene, undefined, undefined, Texture.LINEAR_LINEAR_MIPLINEAR)
            // reflection.texture = this.mirror
            reflection.texture = new Texture('assets/skybox.png', scene)
            reflection.texture.coordinatesMode = Texture.EQUIRECTANGULAR_MODE
            this.water.material = material

            this.water.material!.onBindObservable.add(() => {
              this.mirror.mirrorPlane = Plane.FromPositionAndNormal(this.water.position, Vector3.Down())
            })
          })
        } else {
          if (mesh.material instanceof PBRMaterial) {
            mesh.material.specularIntensity = Math.min(mesh.material.specularIntensity, .1)
          }

          this.shadowGenerator.addShadowCaster(mesh)

          mesh.checkCollisions = true

          try {
            mesh.receiveShadows = true
          } catch (ignored) {}
        }
      })
    })
  }

  update() {
    this.player.update()

    const cameraGround = new Ray(this.camera.position, Vector3.Down(), 1).intersectsMesh(this.ground)

    if (cameraGround.hit) {
      this.camera.setPosition(new Vector3(this.camera.position.x, cameraGround.pickedPoint!.y + 1, this.camera.position.z))
    }

    const t = this.player.player.position.add(new Vector3(0, 2, 0))
    const d = Vector3.Distance(this.camera.position, t)
    const dir = this.camera.position.subtract(t).normalize()
    const ray = new Ray(t, dir, d)
    const hits = ray.intersectsMeshes(this.meshes)

    if (hits?.[0]?.hit) {
      this.camera.setPosition(Vector3.Lerp(this.camera.position, hits[0]!.pickedPoint!.subtract(dir), .125))
    }

    this.skybox.update()

    const waterRay = new Ray(this.camera.position, Vector3.Up()).intersectsMesh(this.water)

    if (waterRay.hit) {
      this.scene.clearColor = new Color4(.5, 0.7, 1)
      this.scene.clearColor = new Color4(.5 * .8, 0.7 * .8, .8)
      this.scene.fogColor = new Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b)
      this.scene.ambientColor = new Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b)
      this.scene.fogDensity = .125
      this.skybox.skybox.applyFog = true
    } else {
      this.scene.clearColor = this.clearColor
      this.scene.fogColor = new Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b)
      this.scene.ambientColor = new Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b)
      this.scene.fogDensity = .0025
      this.skybox.skybox.applyFog = false
    }
  }
}
