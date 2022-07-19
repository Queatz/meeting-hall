import {
  AbstractMesh,
  Camera,
  Color3,
  ColorCorrectionPostProcess,
  DefaultRenderingPipeline,
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

export class PostProcess {

  private film?: ColorCorrectionPostProcess
  // private outline?: HighlightLayer

  private godrays?: VolumetricLightScatteringPostProcess
  private motionBlur?: MotionBlurPostProcess;

  constructor(private scene: Scene, private camera: Camera, engine: Engine, private sunDirection: Vector3, excludeMeshes: Array<AbstractMesh>) {

    const quality = 2

    const pipeline = new DefaultRenderingPipeline('Default Pipeline', true, scene, [ camera ])
    pipeline.samples = 2
    pipeline.fxaaEnabled = true

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

    if (quality >= 2) {
      const ssao = new SSAO2RenderingPipeline('ssaopipeline', scene, .667, [camera])
      ssao.totalStrength = .667
      ssao.samples = 15
      ssao.radius = 1

      this.motionBlur = new MotionBlurPostProcess(
        "Motion Blur Post Process",
        scene,
          1,
        camera
      )
      this.motionBlur.isObjectBased = false
      this.motionBlur.motionBlurSamples = 8
      this.motionBlur.motionStrength = .05
    }

    // this.outline = new HighlightLayer("hl1", scene, { isStroke: true, blurVerticalSize: .125, blurHorizontalSize: .125, blurTextureSizeRatio: .75, mainTextureRatio: 1 })

    this.toggleFilmSimulation(localStorage.getItem('film'))
  }

  update() {
    this.godrays?.mesh.position.copyFrom(this.camera.position.subtract(this.sunDirection.scale(this.camera.maxZ * .8)))
  }

  addOutlineMesh(mesh: Mesh) {
    // this.outline?.addMesh(mesh, new Color3(1 / 256, 1 / 256, 1 / 256))
  }

  toggleFilmSimulation(film?: string | null) {
    const luts = [
      // '',
      'assets/color.png',
      'assets/colored pencil4.png',
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
        1.0,
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
