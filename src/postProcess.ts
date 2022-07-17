import {
  AbstractMesh,
  Camera,
  Color3, ColorCorrectionPostProcess,
  DefaultRenderingPipeline,
  Engine,
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

  constructor(private scene: Scene, private camera: Camera, engine: Engine, sunDirection: Vector3, excludeMeshes: Array<AbstractMesh>) {

    const quality = 0

    const pipeline = new DefaultRenderingPipeline('Default Pipeline', true, scene, [ camera ])
    pipeline.samples = 2
    pipeline.fxaaEnabled = true

    if (quality >= 1) {
      pipeline.bloomEnabled = true
      pipeline.bloomThreshold = .8
      pipeline.bloomWeight = 0.5
      pipeline.bloomKernel = 96
      pipeline.bloomScale = .25
    }
    // pipeline.imageProcessingEnabled = true
    // pipeline.grainEnabled = true
    // pipeline.grain.intensity = 7.5
    // pipeline.grain.animated = true
    // pipeline.imageProcessing.vignetteEnabled = true
    // pipeline.imageProcessing.vignetteWeight = 5.5
    // pipeline.imageProcessing.exposure = 1.5
    // pipeline.imageProcessing.contrast = 1.5
    // pipeline.imageProcessing.toneMappingEnabled = true
    // pipeline.imageProcessing.toneMappingType = TonemappingOperator.Photographic

    if (quality >= 1) {
      const godrays = new VolumetricLightScatteringPostProcess(
        'godrays',
        1.0,
        camera,
        MeshBuilder.CreateSphere('godrays',
          {
            segments: 8,
            diameter: 20
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
      godrays.mesh.position = sunDirection.negate().multiply(Vector3.One().scale(500))

      const godrayMaterial = new StandardMaterial('Godray Material', scene)
      godrayMaterial.emissiveColor = Color3.White()
      godrayMaterial.diffuseColor = Color3.Black()
      godrayMaterial.specularColor = Color3.Black()
      godrays.mesh.material = godrayMaterial
      godrays.mesh.material.disableDepthWrite = true

      godrays.excludedMeshes = excludeMeshes
    }

    if (quality >= 2) {
      const ssao = new SSAO2RenderingPipeline('ssaopipeline', scene, .667, [camera])
      ssao.totalStrength = .75
      ssao.samples = 12
      ssao.radius = 1

      // const motionBlur = new MotionBlurPostProcess(
      //   "Motion Blur Post Process",
      //   scene,
      //   1,
      //   camera
      // )
      // // motionBlur.isObjectBased = false
      // motionBlur.motionBlurSamples = 18
      // motionBlur.motionStrength = .125
    }

    this.toggleFilmSimulation(localStorage.getItem('film'))
  }

  toggleFilmSimulation(film?: string | null) {
    const luts = [
      'assets/color.png',
      'assets/Fuji XTrans III - Classic Chrome.png',
      'assets/lut.png',
      'assets/dusk.png',
      'assets/wash.png',
      'assets/ultra.png',
      'assets/book.png',
    ]

    const i = luts.indexOf(this.film?.colorTableUrl || '') + 1
    const value = film ?? luts[i >= luts.length ? 0 : i]
    this.film?.dispose()
    this.film = new ColorCorrectionPostProcess(
      'Color Correction',
      value,
      1.0,
      this.camera
    )

    localStorage.setItem('film', value)
  }
}
