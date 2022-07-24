import {
  AbstractMesh,
  Camera,
  Color3,
  ColorCorrectionPostProcess,
  DefaultRenderingPipeline,
  DepthRenderer,
  Engine,
  Mesh,
  MeshBuilder,
  MotionBlurPostProcess,
  Scene,
  SSAO2RenderingPipeline,
  StandardMaterial,
  Texture,
  Vector3,
  VolumetricLightScatteringPostProcess
} from '@babylonjs/core'
import { OutlinePostProcess } from "./outlinePostProcess";

export class PostProcess {

  private film?: ColorCorrectionPostProcess
  // private outline?: HighlightLayer

  private godrays?: VolumetricLightScatteringPostProcess
  private motionBlur?: MotionBlurPostProcess;
  private renderer!: DepthRenderer;

  constructor(private scene: Scene, private camera: Camera, engine: Engine, private sunDirection: Vector3, excludeMeshes: Array<AbstractMesh>) {

    const quality = -1

    const pipeline = new DefaultRenderingPipeline('Default Pipeline', true, scene, [ camera ])
    // pipeline.samples = 4
    // pipeline.fxaaEnabled = true

    if (quality >= 1) {
      // pipeline.imageProcessingEnabled = true
      // pipeline.grainEnabled = true
      // pipeline.grain.intensity = 7.5
      // pipeline.grain.animated = true
      // pipeline.imageProcessing.vignetteEnabled = true
      // pipeline.imageProcessing.vignetteWeight = 25
      // pipeline.imageProcessing.vignetteStretch = 1.5
      // pipeline.imageProcessing.vignetteCameraFov = .25
      // pipeline.imageProcessing.exposure = 1.5
      // pipeline.imageProcessing.contrast = 1.5
      // pipeline.imageProcessing.toneMappingEnabled = true
      // pipeline.imageProcessing.toneMappingType = TonemappingOperator.Photographic

      // pipeline.bloomEnabled = true
      // pipeline.bloomThreshold = .6
      // pipeline.bloomWeight = .5
      // pipeline.bloomKernel = 96
      // pipeline.bloomScale = .2

      this.godrays = new VolumetricLightScatteringPostProcess(
        'godrays',
        1.0,
        camera,
        MeshBuilder.CreateSphere('godrays',
          {
            segments: 8,
            diameter: 50
          },
          scene),
        64,
        Texture.BILINEAR_SAMPLINGMODE,
        engine,
        false,
        scene
      )
      this.godrays.mesh.applyFog = false
      this.godrays.exposure = .333
      // this.godrays.decay = 0.987
      // this.godrays.weight =
      // this.godrays.density = 0.992
      this.godrays.mesh.position = sunDirection.negate().multiply(Vector3.One().scale(camera.maxZ * .8))

      const godrayMaterial = new StandardMaterial('Godray Material', scene)
      godrayMaterial.emissiveColor = scene.ambientColor
      godrayMaterial.diffuseColor = Color3.Black()
      godrayMaterial.specularColor = Color3.Black()
      this.godrays.mesh.material = godrayMaterial
      this.godrays.mesh.material.disableDepthWrite = true

      this.godrays.excludedMeshes = excludeMeshes
    }

    if (quality >= 2 || quality < 0) {
      const ssao = new SSAO2RenderingPipeline('ssaopipeline', scene, .667, [camera])
      ssao.totalStrength = .667
      ssao.samples = 16
      ssao.radius = 1

      // this.motionBlur = new MotionBlurPostProcess(
      //   "Motion Blur Post Process",
      //   scene,
      //     1,
      //   camera
      // )
      // this.motionBlur.isObjectBased = false
      // this.motionBlur.motionBlurSamples = 8
      // this.motionBlur.motionStrength = .05
    }

    if (quality < 0) {
      const pixels = 1

      this.renderer = scene.enableDepthRenderer(camera)
       this.renderer.forceDepthWriteTransparentMeshes = true

      scene.onReadyObservable.add(() => {
        this.renderer.getDepthMap().resize({
          width: scene.getEngine().getRenderWidth() * pixels,
          height: scene.getEngine().getRenderHeight() * pixels,
        })
        this.renderer.getDepthMap().updateSamplingMode(Texture.NEAREST_SAMPLINGMODE)
      })

      engine.onResizeObservable.add(event => {
        this.renderer.getDepthMap().resize({
          width: scene.getEngine().getRenderWidth() * pixels,
          height: scene.getEngine().getRenderHeight() * pixels,
        })
        this.renderer.getDepthMap().updateSamplingMode(Texture.NEAREST_SAMPLINGMODE)
      })

      const outline = new OutlinePostProcess('outline', this.renderer.getDepthMap(), pixels, camera)
      outline.threshold = 0.05
      outline.depthThreshold = 0.001
      outline.edgeAmount = 4
      outline.edgeOffset = 1.25

      // const pp = new ScreenSpaceCurvaturePostProcess("Post", scene, 1, camera)
      // pp.valley = 8
      // pp.ridge = 0

      // outline.adaptScaleToCurrentViewport = true
      // outline.scaleMode = Engine.SCALEMODE_FLOOR

      engine.onResizeObservable.add(event => {
        outline.renderTargetSamplingMode = Texture.NEAREST_SAMPLINGMODE
      //   outline.width = Math.floor(scene.getEngine().getRenderWidth() * pixels)
      //   outline.height = Math.floor(scene.getEngine().getRenderHeight() * pixels)
      })
    }

    // this.outline = new HighlightLayer("hl1", scene, { isStroke: true, blurVerticalSize: .125, blurHorizontalSize: .125, blurTextureSizeRatio: .75, mainTextureRatio: 1 })
    //
    this.toggleFilmSimulation(localStorage.getItem('film'))
  }

  update() {
    this.godrays?.mesh.position.copyFrom(this.camera.position.subtract(this.sunDirection.scale(this.camera.maxZ * .8)))
  }

  addOutlineMesh(mesh: Mesh) {
    // this.outline?.addMesh(mesh, new Color3(1 / 256 / 2, 1 / 256 / 2, 1 / 256 / 2))
  }

  toggleFilmSimulation(film?: string | null) {
    const luts = [
      // '',
      'assets/color.png',
      'assets/colored pencil4.png',
      // 'assets/story.png',
      // 'assets/story3.png',
      // 'assets/forest.png',
      // 'assets/forest2.png',
      // 'assets/book.png',
      // 'assets/colored pencil.png',
      // 'assets/lut.png',
      // 'assets/colored pencil3.png',
      // 'assets/book2.png',
      // 'assets/bright.png',
    ]

    const i = luts.indexOf(this.film?.colorTableUrl || '') + 1
    const value = film ?? luts[i >= luts.length ? 0 : i]
    this.film?.dispose()

    if (value !== '') {
      this.film = new ColorCorrectionPostProcess(
        'Color Correction',
        value,
        1,
        this.camera
      )
    } else {
      this.film = undefined
    }

    localStorage.setItem('film', value)
  }

  setPlayer(player: AbstractMesh) {
    this.motionBlur?.excludeSkinnedMesh(player)
  }
}
