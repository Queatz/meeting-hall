import {
  Camera,
  Constants,
  Effect,
  Engine,
  Nullable,
  PostProcess,
  PostProcessOptions,
  RenderTargetTexture,
  Scene,
  SerializationHelper,
  serialize
} from '@babylonjs/core'

Effect.ShadersStore['outlineFragmentShader'] = `
#ifdef GL_ES
precision highp float;
#endif

// Samplers
varying vec2 vUV;
uniform sampler2D textureSampler;
uniform sampler2D depthSampler;
uniform vec2 screenSize;
uniform vec4 sharpnessAmounts;

void main(void)
{
  vec2 onePixel = vec2(1.0, 1.0) / screenSize * sharpnessAmounts.w;
  vec4 color = texture2D(textureSampler, vUV);
  vec4 depth = texture2D(depthSampler, vUV);
    
  vec4 edgeDetection =
    texture2D(textureSampler, vUV + onePixel * vec2(0, -1)) +
    texture2D(textureSampler, vUV + onePixel * vec2(-1, 0)) +
    texture2D(textureSampler, vUV + onePixel * vec2(1, 0)) +
    texture2D(textureSampler, vUV + onePixel * vec2(0, 1)) -
        color * 4.0;
        
  vec4 edgeDetectionInverse =
    -texture2D(textureSampler, vUV + onePixel * vec2(0, -1)) +
    -texture2D(textureSampler, vUV + onePixel * vec2(-1, 0)) +
    -texture2D(textureSampler, vUV + onePixel * vec2(1, 0)) +
    -texture2D(textureSampler, vUV + onePixel * vec2(0, 1)) +
        color * 4.0;
        
  float depthEdgeDetection =
    texture2D(depthSampler, vUV + onePixel * vec2(0, -1)).r +
    texture2D(depthSampler, vUV + onePixel * vec2(-1, 0)).r +
    texture2D(depthSampler, vUV + onePixel * vec2(1, 0)).r +
    texture2D(depthSampler, vUV + onePixel * vec2(0, 1)).r -
        depth.r * 4.0;

  float amount = dot(edgeDetection.rgb, vec3(1.)) / 3.;
  float amountDepth = dot(edgeDetectionInverse.rgb, vec3(1.)) / 3. > sharpnessAmounts.y ? 0. : depthEdgeDetection;
  vec4 edge = (amount > sharpnessAmounts.y || amountDepth > sharpnessAmounts.z) ? vec4(vec3(clamp(1. - amount - amountDepth, 0., 1.)) / sharpnessAmounts.x, 1.) : vec4(1.);
  gl_FragColor = color * edge;
}
`

export class OutlinePostProcess extends PostProcess {

  @serialize()
  public threshold: number = 0.5

  @serialize()
  public depthThreshold: number = 0.005

  @serialize()
  public edgeAmount: number = 2.0

  @serialize()
  public edgeOffset: number = 1.0

  public depth: Nullable<RenderTargetTexture> = null

  public getClassName(): string {
    return 'OutlinePostProcess'
  }

  /**
   * Creates a new instance ConvolutionPostProcess
   * @param name The name of the effect.
   * @param depth The depth texture
   * @param options The required width/height ratio to downsize to before computing the render pass.
   * @param camera The camera to apply the render pass to.
   * @param samplingMode The sampling mode to be used when computing the pass. (default: 0)
   * @param engine The engine which the post process will be applied. (default: current engine)
   * @param reusable If the post process can be reused on the same frame. (default: false)
   * @param textureType Type of textures used when performing the post process. (default: 0)
   * @param blockCompilation If compilation of the shader should not be done in the constructor. The updateEffect method can be used to compile the shader at a later time. (default: false)
   */
  constructor(
    name: string,
    depth: Nullable<RenderTargetTexture>,
    options: number | PostProcessOptions,
    camera: Nullable<Camera>,
    samplingMode: number = Engine.TEXTURE_NEAREST_SAMPLINGMODE,
    engine?: Engine,
    reusable?: boolean,
    textureType: number = Constants.TEXTURETYPE_UNSIGNED_INT,
    blockCompilation = false
  ) {
    super(name, 'outline', ['sharpnessAmounts', 'screenSize'], ['depthSampler'], options, camera, samplingMode, engine, reusable, null, textureType, undefined, null, blockCompilation)

    this.depth = depth

    this.onApply = (effect: Effect) => {
      effect.setFloat2('screenSize', this.width, this.height)
      effect.setFloat4('sharpnessAmounts', this.edgeAmount, this.threshold, this.depthThreshold, this.edgeOffset)
      effect.setTexture('depthSampler', this.depth)
    }
  }

  /**
   * @param parsedPostProcess
   * @param targetCamera
   * @param scene
   * @param rootUrl
   * @hidden
   */
  public static _Parse(parsedPostProcess: any, targetCamera: Camera, scene: Scene, rootUrl: string) {
    return SerializationHelper.Parse(
      () => {
        return new OutlinePostProcess(
          parsedPostProcess.name,
          null,
          parsedPostProcess.options,
          targetCamera,
          parsedPostProcess.renderTargetSamplingMode,
          scene.getEngine(),
          parsedPostProcess.textureType,
          parsedPostProcess.reusable
        )
      },
      parsedPostProcess,
      scene,
      rootUrl
    )
  }
}
