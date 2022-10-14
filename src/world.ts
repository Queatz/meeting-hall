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
  Material,
  Mesh,
  MeshBuilder,
  MirrorTexture,
  PBRMaterial,
  PBRMetallicRoughnessMaterial,
  Ray,
  Scene,
  SceneLoader,
  Texture,
  TransformNode,
  Vector2,
  Vector3,
  VertexData
} from '@babylonjs/core'
import { Sky } from './sky'
import { PostProcess } from './postProcess'
import { Player } from './player'
import { Ui } from './ui'
import { Npc } from './npc'
import { Story } from './story/story'
import { WaterMaterial } from '@babylonjs/materials'
import { Entropy } from './entropy'
import * as randn from '@stdlib/random-base-uniform'

export class World {

  ground!: Mesh
  edgeMesh?: Mesh
  edgeBottom?: Mesh
  water?: AbstractMesh
  waterEdges?: AbstractMesh
  camera: ArcRotateCamera
  shadowGenerator: CascadedShadowGenerator
  mirror?: MirrorTexture
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
    const cameraMaxZ = 1000 // 500

    scene.fogMode = Scene.FOGMODE_EXP2
    scene.fogDensity = .001
    // scene.clearColor = new Color4(.5, .667, 1)
    // scene.clearColor = new Color4(.667, .822, 1)
    scene.clearColor = new Color4(1, 1, 1, 1)
    // scene.clearColor = Color3.Random().toColor4()
    // scene.clearColor = new Color3(0, 0, 0).toColor4()
    // scene.clearColor = new Color4(1, .7, .5) // evening
    // scene.clearColor = new Color4(1, .667, .125).scale(.05)
    // scene.clearColor = new Color4(.8, .9, .95).scale(1)
    scene.ambientColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)
    scene.fogColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)

    this.clearColor = scene.clearColor

    this.camera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2, this.cameraTargetRadius, Vector3.Zero(), scene)
    this.camera.attachControl(canvas, true, true)
    this.camera.upperRadiusLimit = 250
    this.camera.lowerRadiusLimit = 2.5
    this.camera.upperBetaLimit = Math.PI / 2 + Math.PI / 4
    this.camera.fov = .5//1.333
    this.camera.minZ = 1
    this.camera.maxZ = cameraMaxZ
    // ;(this.camera.inputs.attached['keyboard'] as ArcRotateCameraKeyboardMoveInput).angularSpeed = 0.001
    ;(this.camera.inputs.attached['mousewheel'] as ArcRotateCameraMouseWheelInput).wheelPrecision = 2 // 64
    // ;(this.camera.inputs.attached['mousewheel'] as ArcRotateCameraMouseWheelInput).detachControl()

    this.sun = new DirectionalLight('Sun', new Vector3(-1, -.25, 0).normalize(), scene)
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

    // this.mirror = new MirrorTexture('main', 512, scene, true)
    // this.mirror.level = 1
    // this.mirror.renderList = [ this.skybox.skybox ]
    // this.scene.customRenderTargets.push(this.mirror)

    this.waterMaterial = new WaterMaterial('Water', scene, new Vector2(1024, 1024).scale(1))
    this.waterMaterial.bumpTexture = new Texture('assets/waterbump.png', scene)
    this.waterMaterial.bumpHeight = .25
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
    this.waterMaterial.specularColor = Color3.White().scale(.5)
    this.waterMaterial.specularPower = 1024
    this.waterMaterial.addToRenderList(this.skybox.skybox)

    const generateWorld = true

    if (generateWorld) {
      SceneLoader.LoadAssetContainerAsync('/assets/', 'forest.glb', scene).then((result: ISceneLoaderAsyncResult) => {
        this.setupWorld([
          [result.meshes.filter(x => x.name.startsWith('Pine 1_')), 1],
          [result.meshes.filter(x => x.name.startsWith('Small tree.022_')), 2],
          [result.meshes.filter(x => x.name.startsWith('Fern.029')), 8],
        ])

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

  setupWorld(treeBases: Array<[Array<AbstractMesh>, number]>) {
    const groundMaterial = new PBRMetallicRoughnessMaterial('Ground', this.scene)
    groundMaterial.baseTexture = new Texture('assets/dirt.png', this.scene)
    // groundMaterial.normalTexture = new Texture('assets/waterbump.png', this.scene)
    // groundMaterial.normalTexture.scale(10)
    // ;(groundMaterial.normalTexture as Texture).uScale = 2
    // ;(groundMaterial.normalTexture as Texture).vScale = 2
    groundMaterial.backFaceCulling = false
    // groundMaterial.baseColor = new Color3(.45, .4, .25)
    groundMaterial.metallic = 0
    groundMaterial.roughness = 128

    const waterEdgesMaterial = new PBRMetallicRoughnessMaterial('Water edges', this.scene)
    waterEdgesMaterial.baseColor = Color3.White().scale(1.25)
    waterEdgesMaterial.roughness = 0
    waterEdgesMaterial.metallic = 0
    waterEdgesMaterial.alpha = 0.75
    waterEdgesMaterial.alphaMode = Material.MATERIAL_ALPHABLEND
    waterEdgesMaterial.zOffset = 2

    const sectionSize = 100
    const ts = 1
    const uvScale = .1
    const numberOfTrees = sectionSize * ts * 2 / 8

    const createGround = (xOffset: number, zOffset: number, seedOffset = 0) => {
      const mix = (a: number, b: number, factor: number) => a * (1 - factor) + b * factor

      const positions = new Float32Array((sectionSize + 1) * (sectionSize + 1) * 3)
      const indices = [] as Array<number>
      const normals = [] as Array<number>
      const uvs = new Float32Array((sectionSize + 1) * (sectionSize + 1) * 2)

      const rnd = randn.factory({ seed: 1 + seedOffset })

      const rH = rnd(.25, .5)
      const rW = 1 / rnd(8, 32)

      const entropies = [
        new Entropy(rnd(64, 128) / ts, 512 + seedOffset),
        new Entropy(rnd(32, 64) / ts, 8 + seedOffset),
        new Entropy(rnd(16, 32) / ts, 4 + seedOffset),
        new Entropy(rnd(8, 16) / ts, 84 + seedOffset),
        new Entropy(rnd(64, 256) / ts, 64 + seedOffset)
      ]

      const r = [
        rnd(1 / 8, 8),
        rnd(1 / 8, 8),
        rnd(1 / 8, 8),
        rnd(1 / 8, 8)
      ]

      const smootherstep = (x: number) => Math.max(0, Math.min(1, x * x * x * (x * (x * 6 - 15) + 10)))

      const transforms = [
        (c: number, x: number) => c + x ** r[0],
        (c: number, x: number) => c + x ** r[1] / (2 ** 1),
        (c: number, x: number) => c + x ** r[2] / (2 ** 2),
        (c: number, x: number) => c + x ** r[3] / (2 ** 3),
        (c: number, x: number) => c < -rH / 8 ? c : (c * (smootherstep(Math.min(rW, Math.abs(x - rH)) / rW))),// / (2 ** 4)
      ]

      const h1 = rnd(1, 20) // Max hill height
      const h2 = rnd(-10, -1) // Max underwater depth

      const sample = (x: number, z: number) => {
        const e = entropies
          .map((v, i) => v.sample(x, z))
          .reduce((a, b, i) => transforms[i](a, b))

        return mix(h2, h1, e)
      }

      this.startingPoint.x = sectionSize * ts / 2
      this.startingPoint.z = sectionSize * ts / 2
      this.startingPoint.y = sample(this.startingPoint.x / ts, this.startingPoint.z / ts)

      let deepestDepth = -sectionSize

      const mesh = new Mesh('Ground', this.scene)
      mesh.material = groundMaterial

      for (let z = zOffset * sectionSize; z < (zOffset + 1) * sectionSize + 1; z++) {
        for (let x = xOffset * sectionSize; x < (xOffset + 1) * sectionSize + 1; x++) {
          const i = (z * (sectionSize + 1) + x) * 3
          positions[i] = x * ts
          positions[i + 1] = sample(x, z)
          positions[i + 2] = z * ts

          const uvi = (z * (sectionSize + 1) + x) * 2
          uvs[uvi] = x / ts * uvScale
          uvs[uvi + 1] = z / ts * uvScale

          deepestDepth = Math.min(positions[i + 1] - 10, deepestDepth)
        }
      }

      for (let z = 0; z < sectionSize; z++) {
        for (let x = 0; x < sectionSize; x++) {
          const i = z * (sectionSize + 1) + x

          indices.push(
            i,
            i + 1,
            i + sectionSize + 1
          )

          indices.push(
            i + 1,
            i + sectionSize + 1 + 1,
            i + sectionSize + 1,
          )
        }
      }

      const vertexData = new VertexData()
      vertexData.positions = positions
      vertexData.indices = indices
      vertexData.normals = normals
      vertexData.uvs = uvs

      VertexData.ComputeNormals(positions, indices, normals)
      vertexData.applyToMesh(mesh, true)

      const material = new PBRMetallicRoughnessMaterial('Edge', this.scene)
      material.baseColor = new Color3(.45, .4, .25).scale(.5)

      this.edgeMesh?.dispose()
      this.edgeMesh = this.buildEdgeMesh(deepestDepth, vertexData, sectionSize, material)

      this.edgeBottom?.dispose()

      this.edgeBottom = MeshBuilder.CreatePlane('Edge bottom', {
        width: sectionSize * ts,
        height: sectionSize * ts
      }, this.scene)
      this.edgeBottom.material = material
      this.edgeBottom.position.x = sectionSize * ts / 2
      this.edgeBottom.position.y = deepestDepth
      this.edgeBottom.position.z = sectionSize * ts / 2
      this.edgeBottom.rotate(Vector3.Right(), -Math.PI / 2)

      mesh.checkCollisions = true
      mesh.receiveShadows = true
      this.shadowGenerator.addShadowCaster(mesh)

      // Trees

      this.meshes.length = 0

      // todo interpolate tree location on triangle, not smooth

      const factors = treeBases.map(x => x[1]).reduce((a, b) => a + b)

      if (treeBases.length) {
        const c = sectionSize * ts / 2
        const u = 1
        for(let i = 0; i < numberOfTrees; i++) {
          const [ x, z ] = [ rnd(c - c / u, c + c / u), rnd(c - c / u, c + c / u) ]
          const y = sample(x / ts, z / ts)

          if (y > h1 / 8) {
            const s = rnd(0.8, 1.2)
            const r = rnd(0, Math.PI * 2)

            const choice = Math.floor(rnd(0, factors)) / treeBases.length
            const treeBase = (treeBases.find(x => choice < x[1])??treeBases[0])[0]

            treeBase.forEach((mesh, index) => {
              mesh.receiveShadows = true

              const tree = (mesh as Mesh).createInstance('Tree')
              this.scene.addMesh(tree)
              tree.position.copyFrom(new Vector3(x, y, z))
              this.mapObjects.push(tree)
              tree.checkCollisions = index === 0
              tree.scaling = Vector3.One().scale(s)
              tree.rotate(Vector3.Up(), r)
              this.shadowGenerator.addShadowCaster(tree)
              this.waterMaterial?.addToRenderList(tree)
              this.meshes.push(tree)
            })
          }
        }
      }

      this.water?.dispose()

      this.water = MeshBuilder.CreatePlane('Water', {
        width: sectionSize * ts,
        height: sectionSize * ts
      }, this.scene)
      this.water.position.x = sectionSize * ts / 2
      this.water.position.y = 0
      this.water.position.z = sectionSize * ts / 2
      this.water.rotate(Vector3.Right(), Math.PI / 2)

      this.waterEdges?.dispose()
      this.waterEdges = MeshBuilder.CreateCylinder('Water edges', {
        diameter: sectionSize * ts / Math.SQRT1_2,
        height: -deepestDepth,
        cap: Mesh.NO_CAP,
        tessellation: 4
      }, this.scene)
      this.waterEdges.position.x = sectionSize * ts / 2
      this.waterEdges.position.y = deepestDepth / 2
      this.waterEdges.position.z = sectionSize * ts / 2
      this.waterEdges.rotate(Vector3.Up(), Math.PI / 4)
      this.waterEdges.material = waterEdgesMaterial
      this.waterEdges.alphaIndex = 0

      if (this.waterMaterial) {
        ;(this.waterMaterial.bumpTexture as Texture).uScale = ts
        ;(this.waterMaterial.bumpTexture as Texture).vScale = ts
        this.water.material = this.waterMaterial
      }

      this.waterMaterial?.addToRenderList(mesh)

      if (this.player) {
        this.player.player.position.copyFrom(this.startingPoint)
      }

      this.addSmallHouses(mesh)

      return mesh
    }

    this.ground = createGround(0, 0, Math.floor(Math.random() * 6126))

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
    const ray = new Ray(this.camera.position, dir, Math.min(10, d))
    const hits = ray.intersectsMeshes(this.meshes)

    if (this.scene.deltaTime > 0) {
      if (hits?.[0]?.hit) {
        this.camera.setPosition(Vector3.Lerp(this.camera.position, hits[0]!.pickedPoint!.subtract(dir), .005 * this.scene.deltaTime))
        this.timeSinceCameraHit = 0
      } else {
        const ray = new Ray(t, dir, Math.min(10, this.cameraTargetRadius))
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
        this.scene.fogDensity = .1
        this.skybox.skybox.applyFog = true
      } else {
        this.scene.clearColor = this.clearColor
        this.scene.fogColor = new Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b)
        this.scene.ambientColor = new Color3(this.scene.clearColor.r, this.scene.clearColor.g, this.scene.clearColor.b)
        this.scene.fogDensity = .001
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

  private buildEdgeMesh(depth: number, vertexData: VertexData, sectionSize: number, material: Material): Mesh {
    const mesh = new Mesh('Edge', this.scene)
    mesh.material = material

    const vertices = sectionSize * 4 + 3
    const positions = new Float32Array(vertices * 6)
    const indices = [] as Array<number>
    const normals = [] as Array<number>

    const perimeter = [
      ...new Array(sectionSize + 1).fill(0).map((v, i) => [i, 0]),
      ...new Array(sectionSize).fill(0).map((v, i) => [sectionSize, i + 1]),
      ...new Array(sectionSize + 1).fill(0).map((v, i) => [sectionSize - i, sectionSize]),
      ...new Array(sectionSize).fill(0).map((v, i) => [0, sectionSize - i - 1])
    ]

    for (let index = 0; index < perimeter.length; index++) {
      const p = perimeter[index]
      const i = (p[1] * (sectionSize + 1) + p[0]) * 3

      positions[index * 6] = vertexData.positions!![i]
      positions[index * 6 + 1] = vertexData.positions!![i + 1]
      positions[index * 6 + 2] = vertexData.positions!![i + 2]
      positions[index * 6 + 3] = vertexData.positions!![i]
      positions[index * 6 + 3 + 1] = depth
      positions[index * 6 + 3 + 2] = vertexData.positions!![i + 2]
    }

    for (let i = 0; i < vertices * 2 - 3 - 1; i += 1) {
      if (i % 2 == 0) {
        indices.push(
          i,
          i + 1,
          i + 2
        )
      } else {
        indices.push(
          i + 2,
          i + 1,
          i
        )
      }
    }

    const vd = new VertexData()
    vd.positions = positions
    vd.indices = indices
    vd.normals = normals

    VertexData.ComputeNormals(positions, indices, normals)
    vd.applyToMesh(mesh, true)

    return mesh
  }

  private addSmallHouses(ground: Mesh) {
    const bb = ground.getBoundingInfo().boundingBox

    SceneLoader.LoadAssetContainerAsync('/assets/', 'small house.glb', this.scene).then((result: ISceneLoaderAsyncResult) => {
      const mesh = Mesh.MergeMeshes(
        result.meshes.filter(x => x.name !== '__root__') as Array<Mesh>,
        true,
        true,
        undefined,
        undefined,
        true
      )!

      this.scene.removeMesh(mesh)

      for(let i = 0; i < Math.floor(Math.random() * 20); i++) {
        const position = new Vector3()
        position.x = randn(bb.minimumWorld.x, bb.maximumWorld.x)
        position.z = randn(bb.minimumWorld.z, bb.maximumWorld.z)
        position.y = new Ray(new Vector3(position.x, bb.maximumWorld.y, position.z), Vector3.Down(), bb.extendSize.y).intersectsMesh(ground).pickedPoint?.y || 0

        if (position.y <= 0) continue

        const house = mesh.createInstance('House')
        house.rotate(Vector3.Up(), Math.PI * 2 * Math.random())
        house.position.copyFrom(position)

        house.checkCollisions = true

        this.waterMaterial?.addToRenderList(house)
        this.shadowGenerator.addShadowCaster(house)
        this.mapObjects.push(house)
        this.meshes.push(house)
      }
    })
  }
}
