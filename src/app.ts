import '@babylonjs/core/Debug/debugLayer'
import '@babylonjs/inspector'
import '@babylonjs/loaders/glTF'
import {
  AbstractMesh,
  AnimationGroup,
  ArcRotateCamera,
  ArcRotateCameraMouseWheelInput,
  CascadedShadowGenerator,
  Color3,
  Color4, ColorCorrectionPostProcess, CubeTexture,
  DefaultRenderingPipeline,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh, MeshBuilder,
  MotionBlurPostProcess, PBRMaterial, PhotoDome,
  Quaternion,
  Ray,
  Scene,
  SceneLoader, ShadowGenerator,
  Skeleton,
  SSAO2RenderingPipeline, StandardMaterial, Texture, TonemappingOperator,
  Vector3, VolumetricLightScatteringPostProcess
} from '@babylonjs/core'
import { PlayerInput } from "./input";

class App {
  constructor() {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.id = 'gameCanvas'
    document.body.appendChild(canvas)

    setTimeout(() => canvas.focus())

    const quality = 0

    const engine = new Engine(canvas, true)
    const scene = new Scene(engine)

    const input = new PlayerInput(scene)
    let player!: AbstractMesh
    let ground!: AbstractMesh
    let skeleton!: Skeleton
    let playerAnimations!: Array<AnimationGroup>
    let playerAnimation = 'Idle'
    let idleWeight = 1
    let walkWeight = 0
    let runWeight = 0

    scene.fogMode = Scene.FOGMODE_EXP2
    scene.fogDensity = 0.005
    scene.fogStart = 500
    scene.fogEnd = 1000
    scene.clearColor = new Color4(.5, .667, 1)
    scene.clearColor = new Color4(.667, .822, 1)
    // scene.clearColor = new Color4(1, .7, .5) // evening
    scene.ambientColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)
    scene.fogColor = new Color3(scene.clearColor.r, scene.clearColor.g, scene.clearColor.b)

    const camera: ArcRotateCamera = new ArcRotateCamera('Camera', Math.PI / 2, Math.PI / 2, 2, Vector3.Zero(), scene)
    camera.attachControl(canvas, true)
    camera.upperRadiusLimit = 8
    camera.lowerRadiusLimit = 2
    camera.fov = 1.333
    camera.minZ = 0.1
    camera.maxZ = 1000
    ;(camera.inputs.attached['mousewheel'] as ArcRotateCameraMouseWheelInput).wheelPrecision = 64

    const light1: HemisphericLight = new HemisphericLight('light1', new Vector3(1, 1, 0), scene)
    light1.specular = Color3.Black()
    light1.diffuse = scene.ambientColor
    light1.intensity = .6
    const sun: DirectionalLight = new DirectionalLight('Sun', new Vector3(-.75, -.5, 0).normalize(), scene)
    sun.intensity = 1.2
    sun.shadowMinZ = camera.minZ
    sun.shadowMaxZ = camera.maxZ

    // Post-processing

    const pipeline = new DefaultRenderingPipeline('Default Pipeline', true, scene, [ camera ])
    pipeline.samples = 4
    pipeline.fxaaEnabled = true

    if (quality >= 1) {
      pipeline.bloomEnabled = true
      pipeline.bloomThreshold = 0.75
      pipeline.bloomWeight = 0.75
      pipeline.bloomKernel = 16
      pipeline.bloomScale = .5
    }
    // pipeline.imageProcessingEnabled = true
    // pipeline.grainEnabled = true
    // pipeline.grain.intensity = 7.5
    // pipeline.grain.animated = true
    // pipeline.imageProcessing.vignetteEnabled = true
    // pipeline.imageProcessing.vignetteWeight = 7.5
    // pipeline.imageProcessing.exposure = 1.5
    // pipeline.imageProcessing.contrast = .85
    // pipeline.imageProcessing.toneMappingEnabled = true
    // pipeline.imageProcessing.toneMappingType = TonemappingOperator.Photographic

    const skybox = MeshBuilder.CreateSphere('skyBox', { diameter: 900, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene)
    const skyboxMaterial = new StandardMaterial('skyBox', scene)
    skybox.applyFog = false
    skyboxMaterial.emissiveTexture = new Texture('assets/skybox.png', scene, undefined, false, Texture.NEAREST_SAMPLINGMODE)
    skyboxMaterial.emissiveTexture.coordinatesMode = Texture.EQUIRECTANGULAR_MODE
    skyboxMaterial.disableLighting = true
    skyboxMaterial.diffuseColor = new Color3(0, 0, 0)
    skyboxMaterial.specularColor = new Color3(0, 0, 0)
    skybox.material = skyboxMaterial

    const godrays = new VolumetricLightScatteringPostProcess(
      'godrays',
      1.0,
      camera,
      MeshBuilder.CreateSphere('godrays',
        {
          segments: 8,
          diameter: 15
        },
        scene),
      64,
      Texture.BILINEAR_SAMPLINGMODE,
      engine,
      false,
      scene
    )
    godrays.mesh.applyFog = false
    godrays.exposure = .25
    // godrays.decay = 0.987
    // godrays.weight =
    // godrays.density = 0.992
    godrays.mesh.position = sun.direction.negate().multiply(Vector3.One().scale(100))

    const godrayMaterial = new StandardMaterial('Godray Material', scene)
    godrayMaterial.emissiveColor = Color3.White()
    godrayMaterial.diffuseColor = Color3.Black()
    godrays.mesh.material = godrayMaterial
    godrays.mesh.material.disableDepthWrite = true

    godrays.excludedMeshes = [ skybox ]

    // const lutPostProcess = new ColorCorrectionPostProcess(
    //   'Color Correction',
    //   'assets/Fuji XTrans III - Classic Chrome.png',
    //   1.0,
    //   camera
    // )

    if (quality >= 1) {
      const ssao = new SSAO2RenderingPipeline('ssaopipeline', scene, .667, [camera])
      ssao.totalStrength = .75
      ssao.samples = 12
      ssao.radius = 1

      const motionBlur = new MotionBlurPostProcess(
        "Motion Blur Post Process",
        scene,
        1,
        camera
      )
      motionBlur.isObjectBased = false
      motionBlur.motionBlurSamples = 6
      motionBlur.motionStrength = .125
    }

    const shadowGenerator = new CascadedShadowGenerator(1024 * .75, sun)
    shadowGenerator.transparencyShadow = true
    // shadowGenerator.enableSoftTransparentShadow = true
    // shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_LOW
    shadowGenerator.lambda = .9
    shadowGenerator.bias = .005
    shadowGenerator.normalBias = .05
    shadowGenerator.stabilizeCascades = true
    shadowGenerator.shadowMaxZ = camera.maxZ / 2
    shadowGenerator.splitFrustum()

    // End post-processing

    SceneLoader.ImportMeshAsync('', '/assets/', 'forest.glb', scene).then(result => {
      ground = result.meshes.find(x => x.name === 'Plane.015')!

      result.animationGroups.forEach(anim => {
        anim.start(true)
      })

      result.meshes.forEach(mesh => {
        if (mesh.material instanceof PBRMaterial) {
          mesh.material.specularIntensity = Math.min(mesh.material.specularIntensity, .1)
        }

        shadowGenerator.addShadowCaster(mesh)

        mesh.checkCollisions = true

        try {
          mesh.receiveShadows = true
        } catch (ignored) {}
      })
    })

    SceneLoader.ImportMeshAsync('', '/assets/', 'girl.glb', scene).then(result => {
      player = result.meshes[0]
      player.position.y += 1
      player.position.x += 3

      player.collisionRetryCount = 5
      player.ellipsoidOffset = new Vector3(0, 1.05, 0)

      const target = new Mesh('Camera Target')
      target.setParent(player)
      target.position.y = 2
      target.position.x = 0
      target.position.z = 0

      camera.setTarget(target)
      camera.setPosition(player.position.add(new Vector3(0, 3, -6)))

      skeleton = result.skeletons[0]!
      playerAnimations = result.animationGroups

      result.meshes.forEach(mesh => {
        if (mesh.material instanceof PBRMaterial) {
          mesh.material.specularIntensity = Math.min(mesh.material.specularIntensity, .1)
        }

        shadowGenerator.addShadowCaster(mesh)

        try {
          mesh.receiveShadows = true
        } catch (ignored) {}
      })
    })

    // hide/show the Inspector
    window.addEventListener('keydown', (ev) => {
      // Shift+Ctrl+Alt+I
      if (ev.shiftKey && ev.ctrlKey && ev.altKey && ev.keyCode === 73) {
        if (scene.debugLayer.isVisible()) {
          scene.debugLayer.hide()
        } else {
          scene.debugLayer.show()
        }
      }
    })

    engine.runRenderLoop(() => {
      scene.render()

      if (!player || !ground) {
        return
      }

      const s = 0.005 * scene.deltaTime * (input.key('Shift') || input.button(2) ? 1 : 0.5)

      let x = 0, z = 0

      if (input.key('w') || input.button(0) || input.button(2)) {
        z = s
      }

      if (input.key('a')) {
        x = -s
      }

      if (input.key('s')) {
        z = -s
      }

      if (input.key('d')) {
        x = s
      }

      if (x !== 0 && z !== 0) {
        x = x * Math.sqrt(1)
        z = z * Math.sqrt(1)
      }

      if (x !== 0 || z !== 0) {
        const forward = camera.getDirection(Vector3.Forward()).multiply(new Vector3(1, 0, 1)).normalize().scale(z)
        const right = camera.getDirection(Vector3.Right()).multiply(new Vector3(1, 0, 1)).normalize().scale(x)
        const movement = forward.add(right)

        player.rotationQuaternion = Quaternion.Slerp(player.rotationQuaternion!, Quaternion.FromLookDirectionLH(movement.normalizeToNew(), player.up), .125)
        player.moveWithCollisions(movement)

        playerAnimation = input.key('Shift') || input.button(2) ? 'Run' : 'Walk'
      } else {
        playerAnimation = 'Idle'
      }

      const run = playerAnimations.find(x => x.name === 'Run')!
      const walk = playerAnimations.find(x => x.name === 'Walk')!
      const idle = playerAnimations.find(x => x.name === 'Idle')!

      const as = 0.0125

      if (playerAnimation === 'Run') {
        if (run.isPlaying) {
          if (runWeight < 1) {
            runWeight += Math.min(scene.deltaTime * as, 1)
            run.setWeightForAllAnimatables(runWeight)
          }
        } else {
          runWeight = 0
          run.start(true)
          run.setWeightForAllAnimatables(runWeight)
        }

        if (walk.isPlaying) {
          if (walkWeight > 0) {
            walkWeight -= Math.max(scene.deltaTime * as, 0)

            if (walkWeight === 0) {
              walk.stop()
            } else {
              walk.setWeightForAllAnimatables(walkWeight)
            }
          }
        }

        if (idle.isPlaying) {
          if (idleWeight > 0) {
            idleWeight -= Math.max(scene.deltaTime * as, 0)

            if (idleWeight === 0) {
              idle.stop()
            } else {
              idle.setWeightForAllAnimatables(idleWeight)
            }
          }
        }
      } else if (playerAnimation === 'Walk') {
        if (walk.isPlaying) {
          if (walkWeight < 1) {
            walkWeight += Math.min(scene.deltaTime * as, 1)
            walk.setWeightForAllAnimatables(walkWeight)
          }
        } else {
          walkWeight = 0
          walk.start(true)
          walk.setWeightForAllAnimatables(walkWeight)
        }

        if (idle.isPlaying) {
          if (idleWeight > 0) {
            idleWeight -= Math.max(scene.deltaTime * as, 0)

            if (idleWeight === 0) {
              idle.stop()
            } else {
              idle.setWeightForAllAnimatables(idleWeight)
            }
          }
        }

        if (run.isPlaying) {
          if (runWeight > 0) {
            runWeight -= Math.max(scene.deltaTime * as, 0)

            if (runWeight === 0) {
              run.stop()
            } else {
              run.setWeightForAllAnimatables(runWeight)
            }
          }
        }
      } else if (playerAnimation === 'Idle') {
        if (idle.isPlaying) {
          if (idleWeight < 1) {
            idleWeight += Math.min(scene.deltaTime * as, 1)
            idle.setWeightForAllAnimatables(idleWeight)
          }
        } else {
          idleWeight = 0
          idle.start(true)
          idle.setWeightForAllAnimatables(idleWeight)
        }

        if (walk.isPlaying) {
          if (walkWeight > 0) {
            walkWeight -= Math.max(scene.deltaTime * as, 0)

            if (walkWeight === 0) {
              walk.stop()
            } else {
              walk.setWeightForAllAnimatables(walkWeight)
            }
          }
        }

        if (run.isPlaying) {
          if (runWeight > 0) {
            runWeight -= Math.max(scene.deltaTime * as, 0)

            if (runWeight === 0) {
              run.stop()
            } else {
              run.setWeightForAllAnimatables(runWeight)
            }
          }
        }
      }

      const gravity = new Ray(player.position, Vector3.Up()).intersectsMesh(ground)

      if (!gravity.hit) {
        player.moveWithCollisions(new Vector3(0, -0.005 * scene.deltaTime, 0))
      }

      const ray = new Ray(player.position, Vector3.Up()).intersectsMesh(ground)

      if (ray.hit) {
        player.position.y = ray.pickedPoint!.y
      }

      const cameraGround = new Ray(camera.position, Vector3.Down(), 1).intersectsMesh(ground)

      if (cameraGround.hit) {
        camera.setPosition(new Vector3(camera.position.x, cameraGround.pickedPoint!.y + 1, camera.position.z))
      }

      skybox.rotateAround(Vector3.Zero(), Vector3.Up(), scene.deltaTime * 0.0000125)
    })

    window.addEventListener('resize', () => {
      engine.resize()
    })
  }
}

new App()
