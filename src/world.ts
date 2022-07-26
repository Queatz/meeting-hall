import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  ArcRotateCameraMouseWheelInput,
  BoundingSphere,
  CascadedShadowGenerator,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  ISceneLoaderAsyncResult,
  KeyboardEventTypes,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  PBRMaterial, PBRMetallicRoughnessMaterial,
  Ray,
  Scene,
  SceneLoader,
  Texture,
  TransformNode, Vector2,
  Vector3,
  VertexData
} from '@babylonjs/core'
import { Sky } from './sky'
import { PostProcess } from './postProcess'
import { Player } from './player'
import { Ui } from './ui'
import { Npc } from "./npc";
import { Story } from "./story/story";
import { WaterMaterial } from "@babylonjs/materials";
import { Entropy } from "./entropy";
import * as randn from "@stdlib/random-base-uniform";

export class World {

  ground!: Mesh
  water?: AbstractMesh
  camera: ArcRotateCamera
  shadowGenerator: CascadedShadowGenerator
  mirror: MirrorTexture
  waterMaterial?: WaterMaterial
  startingPoint: Vector3 = new Vector3(0, 0, 0)

  mapObjects = [] as Array<AbstractMesh>

  private skybox: Sky
  private sun: DirectionalLight
  private ambience: HemisphericLight
  postProcess: PostProcess
  private clearColor: Color4

  private player!: Player
  private meshes: Array<AbstractMesh> = []

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
    const cameraMaxZ = 2500 // 500

    scene.fogMode = Scene.FOGMODE_EXP2
    scene.fogDensity = .001 / 10
    // scene.clearColor = new Color4(.5, .667, 1)
    // scene.clearColor = new Color4(.667, .822, 1)
    // scene.clearColor = new Color4(1, 1, 1, 0)
    // scene.clearColor = Color3.Random().toColor4()
    // scene.clearColor = new Color3(0, 0, 0).toColor4()
    // scene.clearColor = new Color4(1, .7, .5) // evening
    // scene.clearColor = new Color4(1, .667, .125).scale(.05)
    scene.clearColor = new Color4(.8, .9, .95).scale(1)
    scene.ambientColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)
    scene.fogColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)

    this.clearColor = scene.clearColor

    this.camera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2, this.cameraTargetRadius, Vector3.Zero(), scene)
    this.camera.attachControl(canvas, true, true)
    this.camera.upperRadiusLimit = 2500
    this.camera.lowerRadiusLimit = 2.5
    this.camera.upperBetaLimit = Math.PI / 2 + Math.PI / 4
    this.camera.fov = .5//1.333
    this.camera.minZ = 1
    this.camera.maxZ = cameraMaxZ
    ;(this.camera.inputs.attached['mousewheel'] as ArcRotateCameraMouseWheelInput).wheelPrecision = 2 // 64
    // ;(this.camera.inputs.attached['mousewheel'] as ArcRotateCameraMouseWheelInput).detachControl()

    this.sun = new DirectionalLight('Sun', new Vector3(-1, -.75, 0).normalize(), scene)
    this.sun.intensity = 1.5
    this.sun.specular = scene.ambientColor
    this.sun.diffuse = scene.ambientColor
    this.sun.shadowMinZ = this.camera.maxZ / 6
    this.sun.shadowMaxZ = this.camera.maxZ / 3

    this.ambience = new HemisphericLight('ambience', this.sun.direction, scene)
    this.ambience.specular = scene.ambientColor
    this.ambience.diffuse = scene.ambientColor
    // this.ambience.diffuse = new Color3(.4, .6, 1)
    this.ambience.intensity = .25
    const ambience = new HemisphericLight('ambience', this.sun.direction.negate(), scene)
    ambience.specular = scene.ambientColor
    ambience.diffuse = scene.ambientColor
    ambience.intensity = .25

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

      return renderList!.filter(x => (x !== this.ground) && BoundingSphere.Intersects(x.getBoundingInfo().boundingSphere, cameraSphere))
    }

    this.mirror = new MirrorTexture('main', 512, scene, true)
    this.mirror.level = 1
    this.mirror.renderList = [ this.skybox.skybox ]
    this.scene.customRenderTargets.push(this.mirror)

    this.waterMaterial = new WaterMaterial('Water', scene, new Vector2(1024, 1024))
    this.waterMaterial.bumpTexture = new Texture('assets/waterbump.png', scene)
    ;(this.waterMaterial.bumpTexture as Texture).uScale = 16 * 4
    ;(this.waterMaterial.bumpTexture as Texture).vScale = 16 * 4
    this.waterMaterial.bumpHeight = .125
    this.waterMaterial.bumpSuperimpose = true
    this.waterMaterial.waveHeight = 0//.1
    this.waterMaterial.waveLength = .5
    this.waterMaterial.windForce = 1 / 16
    this.waterMaterial.waveSpeed = 1 / 16
    // this.waterMaterial.windDirection = new Vector2(0, 1)
    this.waterMaterial.diffuseColor = Color3.White()
    this.waterMaterial.waterColor = Color3.White()//new Color3(.9, 1, .8)
    this.waterMaterial.bumpAffectsReflection = true
    this.waterMaterial.backFaceCulling = false
    this.waterMaterial.addToRenderList(this.skybox.skybox)

    const generateWorld = true

    if (generateWorld) {
      SceneLoader.LoadAssetContainerAsync('/assets/', 'forest.glb', scene).then((result: ISceneLoaderAsyncResult) => {
        this.setupWorld(result.meshes.filter(x => x.name.startsWith('Pine 1_')))

        result.animationGroups.forEach((anim: AnimationGroup) => {
          anim.start(true)
        })

        // Pine Armature.001
      })
    } else {
      SceneLoader.ImportMeshAsync('', '/assets/', 'forest.glb', scene).then((result: ISceneLoaderAsyncResult) => {
        this.player = new Player(this, scene, ui)

        this.ground = result.meshes.find((x: AbstractMesh) => x.name === 'Plane.015')! as Mesh // Ground

        this.waterMaterial?.addToRenderList(this.ground)

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

        // result.meshes.forEach((mesh: AbstractMesh) => {
        //   if (mesh.skeleton && mesh.getMeshUniformBuffer()) {
        //
        //   }
        // })

        // const worldEdge = result.meshes.find((x: AbstractMesh) => x.name === 'Plane.003')!
        // ;(worldEdge.material as PBRMaterial).emissiveColor = new Color3(1, .25, .5).scale(2.25)

        result.meshes.forEach((mesh: AbstractMesh) => {
          if (mesh.name === 'Plane.001') { // water
            this.water = mesh
            this.water.material = this.waterMaterial!

            // this.water.material!.onBindObservable.add(() => {
            //   this.mirror.mirrorPlane = Plane.FromPositionAndNormal(this.water.position, Vector3.Down())
            // })
          } else {
            if (mesh.material instanceof PBRMaterial) {
              mesh.material.specularIntensity = Math.min(mesh.material.specularIntensity, .1)
            }

            if (mesh.name.startsWith('Water')) {
              mesh.material = this.waterMaterial!
            } else {
              // if (mesh !== this.ground) {
                this.shadowGenerator.addShadowCaster(mesh)
                // this.waterMaterial!.addToRenderList(mesh)
              // }


              if (mesh.name.startsWith('Girl') || mesh.name.startsWith('Hair') || mesh.name.startsWith('Panties')) {
                // todo convert to collider sub obj in Blender
                const collider = MeshBuilder.CreateCylinder('Collider', {
                  diameter: Math.min(mesh.getBoundingInfo().boundingBox.extendSizeWorld.z, mesh.getBoundingInfo().boundingBox.extendSizeWorld.x) / 16,
                  height: mesh.getBoundingInfo().boundingBox.extendSizeWorld.y * 2,
                }, scene)
                collider.setParent(mesh)
                collider.position = new Vector3(0, mesh.getBoundingInfo().boundingBox.extendSizeWorld.y, 0)
                collider.checkCollisions = true
                collider.isVisible = false
              } else {
                mesh.checkCollisions = true
              }

              if (mesh instanceof Mesh) {
                if (mesh !== this.ground) {
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
    }

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

  setupWorld(treeBase: Array<AbstractMesh>) {
    const groundMaterial = new PBRMetallicRoughnessMaterial('Ground', this.scene)
    groundMaterial.backFaceCulling = false
    groundMaterial.baseColor = new Color3(.45, .4, .25)
    groundMaterial.metallic = 1
    groundMaterial.roughness = 128

    const ts = 8

    const createGround = (xOffset: number, zOffset: number, seedOffset = 0) => {
      const sectionSize = 256

      const positions = new Float32Array(sectionSize * sectionSize * 3)
      const indices = [] as Array<number>
      const normals = [] as Array<number>

      const entropy = new Entropy(4, 4 + seedOffset)
      const entropy2 = new Entropy(32, 512 + seedOffset)
      const groundEntropy = new Entropy(8, 8 + seedOffset)

      const rnd = randn.factory({ seed: 1 + seedOffset })

      const h = rnd(16, 32)
      const f1 = rnd(16, 32) * (rnd(0, 1) > .5 ? -1 : 1)
      const f2 = rnd(8, 16) * (rnd(0, 1) > .5 ? -1 : 1)
      const f3 = rnd(1.5, 3)
      const water = rnd(.125, .5)

      console.log(h, f1, f2, f3, water)

      this.water?.dispose()

      this.water = MeshBuilder.CreateGround('Water', {
        width: sectionSize * ts,
        height: sectionSize * ts,
        subdivisions: sectionSize
      }, this.scene)
      this.water.position.x = sectionSize * ts / 2
      this.water.position.y = -32
      this.water.position.z = sectionSize * ts / 2
      // this.water.rotate(Vector3.Right(), Math.PI / 2)

      if (this.waterMaterial) {
        this.water.material = this.waterMaterial
      }

      const sample = (x: number, z: number) => {
        const v = Math.min(groundEntropy.sample(x, z), Math.pow(entropy2.sample(x, z), f3)) - groundEntropy.sample(x, z) / f1 + entropy.sample(x, z) / f2

        return (v < water ? Math.pow(groundEntropy.sample(x, z), .5) * (h / 16) : entropy.sample(x, z) * Math.pow((v - .5) * (1 / water), 2)) * (h / 8) +
          (Math.max(water, v) - .5) * (1 / water) * h
      }

      const startingElevation = sample((sectionSize / ts) / 2, (sectionSize / ts) / 2)
      this.startingPoint.x = sectionSize * ts / 2
      this.startingPoint.z = sectionSize * ts / 2
      this.startingPoint.y = startingElevation

      const mesh = new Mesh('Ground', this.scene)
      mesh.material = groundMaterial

      for (let z = zOffset * sectionSize; z < (zOffset + 1) * sectionSize; z++) {
        for (let x = xOffset * sectionSize; x < (xOffset + 1) * sectionSize; x++) {
          const i = (z * sectionSize + x) * 3
          positions[i] = x * ts
          positions[i + 1] = sample(x, z)
          positions[i + 2] = z * ts
        }
      }

      for (let z = 0; z < sectionSize - 1; z++) {
        for (let x = 0; x < sectionSize - 1; x++) {
          const i = z * sectionSize + x

          indices.push(
            i,
            i + 1,
            i + sectionSize
          )

          indices.push(
            i + 1,
            i + sectionSize + 1,
            i + sectionSize,
          )
        }
      }

      const vertexData = new VertexData()
      vertexData.positions = positions
      vertexData.indices = indices
      vertexData.normals = normals

      VertexData.ComputeNormals(positions, indices, normals)
      vertexData.applyToMesh(mesh, true)

      mesh.checkCollisions = true
      mesh.receiveShadows = true
      this.shadowGenerator.addShadowCaster(mesh)

      // Trees

      if (treeBase.length) {
        const c = sectionSize * ts / 2
        for(let i = 0; i < 500; i++) {
          const [ x, z ] = [ rnd(c - c / 4, c + c / 4), rnd(c - c / 4, c + c / 4) ]
          const y = sample(x / ts, z / ts)

          if (y > -h / 2) {
            const s = rnd(0.8, 1.2)
            const r = rnd(0, Math.PI * 2)

            treeBase.forEach((mesh, index) => {
              mesh.receiveShadows = true

              const tree = (mesh as Mesh).createInstance('Tree')
              this.scene.addMesh(tree)
              tree.position.copyFrom(new Vector3(x, y - .5, z))
              this.mapObjects.push(tree)
              tree.checkCollisions = index === 0
              tree.scaling.scale(s)
              tree.rotate(Vector3.Up(), r)
              this.shadowGenerator.addShadowCaster(tree)
              this.waterMaterial?.addToRenderList(tree)
            })
          }
        }
      }

      this.waterMaterial?.addToRenderList(mesh)

      return mesh
    }

    this.ground = createGround(0, 0) //6126

    // for (let b = -1; b <= 1; b += 2) {
    //   for (let a = -1; a <= 1; a += 2) {
    //     createGround(a, b)
    //   }
    // }

    this.player = new Player(this, this.scene, this.ui)

    let tPressed = false

    this.scene.onKeyboardObservable.add(eventData => {
      if (eventData.event.key !== 't') return

      switch (eventData.type) {
        case KeyboardEventTypes.KEYDOWN:
          if (!tPressed) {
            this.mapObjects.forEach(mesh => mesh.dispose())
            this.mapObjects.length = 0
            this.ground?.dispose()
            this.ground = createGround(0, 0, Math.floor(Math.random() * 100000))
          }
          tPressed = true
          break
        case KeyboardEventTypes.KEYUP:
          tPressed = false
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

    if (this.water) {
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
  }

  private static interpolate(value: number) {
    if (value < .5) {
      return Math.pow(value * 2, 2) / 2
    } else {
      return 1 - Math.pow(1 - ((value - .5) * 2), 2) / 2
    }
  }
}
