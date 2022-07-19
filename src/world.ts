import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  ArcRotateCameraMouseWheelInput, BoundingSphere,
  CascadedShadowGenerator,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight, HighlightLayer,
  KeyboardEventTypes, Mesh,
  MirrorTexture,
  NodeMaterial,
  PBRMaterial,
  Plane,
  PointerEventTypes,
  Ray,
  ReflectionBlock,
  Scene,
  SceneLoader, ShadowGenerator,
  Texture,
  TextureBlock,
  TransformNode,
  Vector3
} from '@babylonjs/core'
import { Sky } from './sky'
import { PostProcess } from './postProcess'
import { Player } from './player'
import { ISceneLoaderAsyncResult } from '@babylonjs/core'
import { Ui } from './ui'
import { Npc } from "./npc";
import { Story } from "./story/story";

export class World {

  ground!: AbstractMesh
  water!: AbstractMesh
  camera: ArcRotateCamera
  shadowGenerator: CascadedShadowGenerator
  mirror: MirrorTexture
  startingPoint: Vector3 = new Vector3(3, 1, 140)

  private skybox: Sky
  private sun: DirectionalLight
  private ambience: HemisphericLight
  postProcess: PostProcess
  private clearColor: Color4

  private player!: Player
  private meshes!: Array<AbstractMesh>

  private currentNpc?: AbstractMesh | TransformNode
  private npcSceneCameraTarget = Vector3.Zero()
  private npcSceneCamera = 0

  private cameraTargetRadius = 10
  private timeSinceCameraHit = 0

  private story = new Story(this.ui)
  private npc = new Npc()

  get ready() {
    return !!this.ground && this.player?.ready
  }

  constructor(private scene: Scene, private ui: Ui, engine: Engine, canvas: HTMLCanvasElement) {
    const cameraMaxZ = 500

    scene.fogMode = Scene.FOGMODE_EXP2
    scene.fogDensity = .0015
    scene.clearColor = new Color4(.5, .667, 1)
    scene.clearColor = new Color4(.667, .822, 1)
    scene.clearColor = new Color4(1, 1, 1, 0)
    // scene.clearColor = Color3.Random().toColor4()
    // scene.clearColor = new Color3(0, 0, 0).toColor4()
    // scene.clearColor = new Color4(1, .7, .5) // evening
    scene.ambientColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)
    scene.fogColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)

    this.clearColor = scene.clearColor

    this.camera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2, this.cameraTargetRadius, Vector3.Zero(), scene)
    this.camera.attachControl(canvas, true, true)
    this.camera.upperRadiusLimit = 17.5
    this.camera.lowerRadiusLimit = 2.5
    this.camera.upperBetaLimit = Math.PI / 2 + Math.PI / 4
    this.camera.fov = .5//1.333
    this.camera.minZ = 0.5
    this.camera.maxZ = cameraMaxZ
    ;(this.camera.inputs.attached['mousewheel'] as ArcRotateCameraMouseWheelInput).wheelPrecision = 64
    // ;(this.camera.inputs.attached['mousewheel'] as ArcRotateCameraMouseWheelInput).detachControl()

    this.sun = new DirectionalLight('Sun', new Vector3(-1, -.75, 0).normalize(), scene)
    this.sun.intensity = 1
    this.sun.specular = scene.ambientColor
    this.sun.diffuse = scene.ambientColor
    this.sun.shadowMinZ = this.camera.maxZ / 6
    this.sun.shadowMaxZ = this.camera.maxZ / 3

    this.ambience = new HemisphericLight('ambience', this.sun.direction.negate(), scene)
    this.ambience.specular = scene.ambientColor
    this.ambience.diffuse = scene.ambientColor
    // this.ambience.diffuse = new Color3(.4, .6, 1)
    this.ambience.intensity = .667

    this.skybox = new Sky(this, scene)
    this.postProcess = new PostProcess(scene, this.camera, engine, this.sun.direction, [ this.skybox.skybox ])

    this.shadowGenerator = new CascadedShadowGenerator(768/2, this.sun)
    this.shadowGenerator.usePercentageCloserFiltering = true
    this.shadowGenerator.bias = .005
    this.shadowGenerator.normalBias = .01
    this.shadowGenerator.stabilizeCascades = true
    this.shadowGenerator.frustumEdgeFalloff = 0.25
    // this.shadowGenerator.forceBackFacesOnly = true
    this.shadowGenerator.shadowMaxZ = this.camera.maxZ / 3
    this.shadowGenerator.splitFrustum()

    this.shadowGenerator.getShadowMap()!.getCustomRenderList = (layer, renderList, renderListLength) => {
      if (!renderList) {
        return null
      }

      const cameraSphere = BoundingSphere.CreateFromCenterAndRadius(this.camera.position, this.shadowGenerator.shadowMaxZ * .75)

      return renderList!.filter(x => x !== this.ground && BoundingSphere.Intersects(x.getBoundingInfo().boundingSphere, cameraSphere))
    }

    this.mirror = new MirrorTexture('main', 512, scene, true)
    this.mirror.level = 1
    this.mirror.renderList = [ this.skybox.skybox ]
    this.scene.customRenderTargets.push(this.mirror)

    SceneLoader.ImportMeshAsync('', '/assets/', 'forest.glb', scene).then((result: ISceneLoaderAsyncResult) => {
      this.player = new Player(this, scene, ui)

      this.ground = result.meshes.find((x: AbstractMesh) => x.name === 'Plane.015')! // Ground

      const startingPoint = result.transformNodes.find((x: TransformNode) => x.name === 'Starting point')

      if (startingPoint) {
        this.startingPoint.copyFrom(startingPoint.absolutePosition)
      }

      result.animationGroups.forEach((anim: AnimationGroup) => {
        anim.start(true)
      })

      this.npc.addFromMeshes(result.meshes)
      this.npc.addFromTransformNodes(result.transformNodes)
      this.meshes = result.meshes

      result.meshes.forEach((mesh: AbstractMesh) => {
        if (mesh.skeleton && mesh.getMeshUniformBuffer()) {

        }
      })

      // const worldEdge = result.meshes.find((x: AbstractMesh) => x.name === 'Plane.003')!
      // ;(worldEdge.material as PBRMaterial).emissiveColor = new Color3(1, .25, .5).scale(2.25)

      result.meshes.forEach((mesh: AbstractMesh) => {
        if (mesh.name === 'Plane.001') { // water
          this.water = mesh

          NodeMaterial.ParseFromFileAsync("Water", "assets/water.json", scene).then((material: NodeMaterial) => {
            material.backFaceCulling = false
            // const normalMap = material.getBlockByName('Texture') as TextureBlock
            // const reflection = material.getBlockByName('Reflection') as ReflectionBlock
            // normalMap.texture = new Texture('assets/waterbump.png', scene, undefined, undefined, Texture.LINEAR_LINEAR_MIPLINEAR)
            // reflection.texture = this.mirror
            // reflection.texture.coordinatesMode = Texture.EQUIRECTANGULAR_MODE
            // reflection.texture.isCube = true
            // this.water.material = material

            this.water.material!.onBindObservable.add(() => {
              this.mirror.mirrorPlane = Plane.FromPositionAndNormal(this.water.position, Vector3.Down())
            })
          })
        } else {
          if (mesh.material instanceof PBRMaterial) {
            mesh.material.specularIntensity = Math.min(mesh.material.specularIntensity, .1)
          }

          if (mesh.name.startsWith('Water')) {

          } else {
            if (mesh !== this.ground) {
              this.shadowGenerator.addShadowCaster(mesh)
            }

            mesh.checkCollisions = true

            if (mesh instanceof Mesh) {
              if(mesh !== this.ground) {
                this.addOutlineMesh(mesh)
              }
            }

            try {
              mesh.receiveShadows = true
            } catch (ignored) {

            }
          }
        }
      })
    })

    let tabPressed = false

    scene.onKeyboardObservable.add(eventData => {
      if (eventData.event.key !== ' ') return

      switch (eventData.type) {
        case KeyboardEventTypes.KEYDOWN:
          if (!tabPressed) {
            this.postProcess.toggleFilmSimulation()
          }
          tabPressed = true
          break
        case KeyboardEventTypes.KEYUP:
          tabPressed = false
          break
      }
    })
  }

  addOutlineMesh(mesh: Mesh) {
    this.postProcess.addOutlineMesh(mesh)
  }

  update() {
    this.player.update()

    if (this.currentNpc) {
      if (Vector3.DistanceSquared(this.currentNpc.absolutePosition, this.player.player.position) > 2) {
        this.ui.clear()
        this.currentNpc = undefined
      }
    } else {
      this.npc.npcs.forEach(npc => {
        if (Vector3.DistanceSquared(npc.absolutePosition, this.player.player.position) < 2) {
          this.currentNpc = npc
          this.npcSceneCamera = 0
          this.npcSceneCameraTarget = Vector3.Lerp(this.currentNpc.absolutePosition.add(new Vector3(0, 2, 0)), this.player.target.absolutePosition, .5)

          this.story.show(this.npc.getNpcData(npc))
        }
      })
    }

    if (this.currentNpc) {
      if (this.npcSceneCamera < 1) {
        this.npcSceneCamera += this.scene.deltaTime * .00125
        this.npcSceneCamera = Math.min(1, this.npcSceneCamera)
      }

      this.camera.setTarget(Vector3.Lerp(this.player.target.absolutePosition, this.npcSceneCameraTarget, World.interpolate(this.npcSceneCamera)))
    } else {
      if (this.npcSceneCamera > 0) {
        this.npcSceneCamera -= this.scene.deltaTime * .00125
        this.npcSceneCamera = Math.max(0, this.npcSceneCamera)

        if (this.npcSceneCamera) {
          this.camera.setTarget(Vector3.Lerp(this.player.target.absolutePosition, this.npcSceneCameraTarget, World.interpolate(this.npcSceneCamera)))
        } else {
          this.camera.setTarget(this.player.target)
        }
      }
    }

    const cameraGround = new Ray(this.camera.position, Vector3.Down(), 1).intersectsMesh(this.ground)

    if (cameraGround.hit) {
      this.camera.setPosition(new Vector3(this.camera.position.x, cameraGround.pickedPoint!.y + 1, this.camera.position.z))
    }

    const t = this.player.player.position.add(new Vector3(0, 2, 0))
    const d = Vector3.Distance(this.camera.position, t)
    const dir = this.camera.position.subtract(t).normalize()
    const ray = new Ray(t, dir, d)
    const hits = ray.intersectsMeshes(this.meshes)

    if (this.scene.deltaTime > 0) {
      if (hits?.[0]?.hit) {
        this.camera.setPosition(Vector3.Lerp(this.camera.position, hits[0]!.pickedPoint!.subtract(dir), .005 * this.scene.deltaTime))
        this.timeSinceCameraHit = 0
      } else {
        const ray = new Ray(t, dir, this.cameraTargetRadius)
        const hits = ray.intersectsMeshes(this.meshes)

        if (hits?.[0]?.hit) {
          this.camera.setPosition(Vector3.Lerp(this.camera.position, hits[0]!.pickedPoint!.subtract(dir), .005 * this.scene.deltaTime))
          this.timeSinceCameraHit = 0
        } else {
          this.timeSinceCameraHit += this.scene.deltaTime

          // Allow the user to set the radius again 1 second after the camera hitting stuff
          if (this.timeSinceCameraHit < 1000) {
            this.camera.setPosition(Vector3.Lerp(this.camera.position, t.add(dir.scale(this.cameraTargetRadius)), .005 * this.scene.deltaTime))
          } else {
            this.cameraTargetRadius = d
          }
        }
      }
    }

    this.sun.position.copyFrom(this.camera.position.subtract(this.sun.direction.scale(this.camera.maxZ * .8)))

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
      this.scene.fogDensity = .0015
      this.skybox.skybox.applyFog = false
    }
  }

  private static interpolate(value: number) {
    if (value < .5) {
      return Math.pow(value * 2, 2) / 2
    } else {
      return 1 - Math.pow(1 - ((value - .5) * 2), 2) / 2
    }
  }
}
