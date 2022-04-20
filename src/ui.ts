import {
  ArcRotateCamera,
  Camera,
  Color4,
  DynamicTexture,
  Engine,
  ICanvasRenderingContext,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3
} from '@babylonjs/core'

export class Ui {

  private readonly scene: Scene
  private readonly camera: ArcRotateCamera

  constructor(engine: Engine) {
    this.scene = new Scene(engine)
    this.scene.autoClear = false
    this.scene.clearColor = new Color4(1, 1, 1, 0)

    this.camera = new ArcRotateCamera('UI Camera', -Math.PI / 2,  0, 10, new Vector3(0, 0, 0), this.scene)
    this.camera.maxZ = 100
    this.camera.minZ = 0
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA
    this.camera.orthoLeft = 0
    this.camera.orthoRight = 1
    this.camera.orthoTop = 1
    this.camera.orthoBottom = 0

    this.text('Talk with Amanda ☑', 1)
    this.text('Talk with Alex ☑', 2)
    this.text('Talk with Meg ☐', 3)
    this.text('Talk with Jessica ☐', 4)

    this.box()
  }

  render() {
    const w = this.scene.getEngine().getRenderWidth()
    const h = this.scene.getEngine().getRenderHeight()
    this.camera.orthoTop = h / w
    this.scene.render()
  }

  private text(text: string, position: number) {
    const lineHeight = 1.5
    const fontSize = 24
    const font = 'normal ' + fontSize + 'px Bellota, sans-serif'

    const planeHeight = .025
    const DTHeight = 1.5 * fontSize
    const ratio = planeHeight / DTHeight

    const temp = new DynamicTexture('DynamicTexture', 64, this.scene)
    const tmpCtx = temp.getContext()
    tmpCtx.font = font
    const DTWidth = tmpCtx.measureText(text).width + 32
    temp.dispose()

    const planeWidth = DTWidth * ratio

    const dynamicTexture = new DynamicTexture('DynamicTexture',
      { width: DTWidth, height: DTHeight },
      this.scene,
      false,
      Texture.LINEAR_LINEAR,
      Engine.TEXTUREFORMAT_ALPHA
    )

    dynamicTexture.drawText(text, null, null, font, '#ffffff', null)
    const mat = new StandardMaterial('mat', this.scene)
    mat.emissiveTexture = dynamicTexture
    mat.opacityTexture = dynamicTexture
    mat.disableLighting = true

    const plane = MeshBuilder.CreatePlane('Text', { width: planeWidth, height: planeHeight, updatable: false }, this.scene)
    plane.material = mat
    plane.rotation.x = Math.PI / 2
    plane.position = new Vector3(1 - planeWidth / 2 - planeHeight, 0, planeHeight * lineHeight * position)
  }

  private box() {
    const xRes = 1024
    const aspect = .2
    const padding = .015

    const dynamicTexture = new DynamicTexture('DynamicTexture',
      { width: xRes, height: xRes * aspect },
      this.scene,
      false,
      Texture.LINEAR_LINEAR,
      Engine.TEXTUREFORMAT_ALPHA,
    )

    dynamicTexture.getContext().fillStyle = '#ffffff'
    Ui.canvasRoundRect(dynamicTexture.getContext(), 0, 0, xRes, xRes * aspect, 16)
    dynamicTexture.update()

    const mat = new StandardMaterial('mat', this.scene)
    mat.emissiveTexture = dynamicTexture
    mat.opacityTexture = dynamicTexture
    mat.disableLighting = true

    mat.backFaceCulling = false

    const w = 1 - padding * 2
    const h = w * aspect

    const plane = MeshBuilder.CreatePlane('Text', { width: w, height: h, updatable: false }, this.scene)
    plane.material = mat
    plane.rotation.x = Math.PI / 2
    plane.position = new Vector3(w / 2 + padding, 0, h / 2 + padding)
  }

  private static canvasRoundRect(context: ICanvasRenderingContext, x: number, y: number, w: number, h: number, radius: number) {
    const r = x + w
    const b = y + h
    context.beginPath()
    context.moveTo(x + radius, y)
    context.lineTo(r - radius, y)
    context.quadraticCurveTo(r, y, r, y + radius)
    context.lineTo(r, y + h - radius)
    context.quadraticCurveTo(r, b, r - radius, b)
    context.lineTo(x + radius, b)
    context.quadraticCurveTo(x, b, x, b - radius)
    context.lineTo(x, y + radius)
    context.quadraticCurveTo(x, y, x + radius, y)
    context.fill()
  }
}
