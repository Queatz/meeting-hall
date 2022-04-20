import {
  AbstractMesh, ActionManager,
  ArcRotateCamera,
  Camera,
  Color4,
  DynamicTexture,
  Engine, ExecuteCodeAction,
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

  get blockPointer() {
    return !!this.scene.getPointerOverMesh()
  }

  constructor(engine: Engine) {
    this.scene = new Scene(engine)
    this.scene.autoClear = false
    this.scene.clearColor = new Color4(1, 1, 1, 0)

    this.camera = new ArcRotateCamera('UI Camera', -Math.PI / 2, Math.PI / 2, 50, new Vector3(0, 0, 0), this.scene)
    this.camera.maxZ = 100
    this.camera.minZ = 0
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA
    this.camera.orthoLeft = 0
    this.camera.orthoRight = 1
    this.camera.orthoTop = 1
    this.camera.orthoBottom = 0

    // this.text('Talk with Amanda ☑', 1, undefined, undefined, true)
    // this.text('Talk with Alex ☑', 2, undefined, undefined, true)
    // this.text('Talk with Meg ☐', 3, undefined, undefined, true)
    // this.text('Talk with Jessica ☐', 4, undefined, undefined, true)

    this.box()

    this.text('Amanda', 6, '#000000', 'bold')
    this.text('"Hey, how\'s it going?"' , 5, '#000000')
    this.text('', 4, '#000000')
    this.text('➺ I want to know more about George', 3, '#000000', undefined, undefined, () => {})
    this.text('➺ Can you tell me something about Samantha?', 2, '#000000', undefined, undefined, () => {})
    this.text('➺ Where do you like to hang out?', 1, '#000000', undefined, undefined, () => {})
  }

  render() {
    const w = this.scene.getEngine().getRenderWidth()
    const h = this.scene.getEngine().getRenderHeight()
    this.camera.orthoTop = h / w
    this.scene.render()
  }

  private text(
    text: string,
    position: number,
    color = '#ffffff',
    style = 'normal',
    rightAlign = false,
    click?: () => void
  ): AbstractMesh {
    const lineHeight = 1.25
    const fontSize = 24
    const font = style + ' ' + fontSize + 'px Bellota, sans-serif'

    const planeHeight = .025
    const DTHeight = 1.5 * fontSize
    const ratio = planeHeight / DTHeight

    const temp = new DynamicTexture('DynamicTexture', 64, this.scene)
    const tmpCtx = temp.getContext()
    tmpCtx.font = font
    const DTWidth = tmpCtx.measureText(text).width + 32
    temp.dispose()

    const planeWidth = DTWidth * ratio
    const padding = .015

    const dynamicTexture = new DynamicTexture('DynamicTexture',
      { width: DTWidth, height: DTHeight },
      this.scene,
      false,
      Texture.LINEAR_LINEAR,
      Engine.TEXTUREFORMAT_ALPHA
    )

    dynamicTexture.drawText(text, null, null, font, color, null)
    const mat = new StandardMaterial('mat', this.scene)
    mat.emissiveTexture = dynamicTexture
    mat.opacityTexture = dynamicTexture
    mat.disableLighting = true

    const plane = MeshBuilder.CreatePlane('Text', { width: planeWidth, height: planeHeight, updatable: false }, this.scene)
    plane.material = mat
    // plane.rotation.x = Math.PI / 2
    plane.position = new Vector3(
      rightAlign ? 1 - planeWidth / 2 - padding : planeWidth / 2 + padding,
      planeHeight * lineHeight * position + padding,
      0,
    )

    plane.enablePointerMoveEvents = true

    if (click) {
      plane.actionManager = new ActionManager(this.scene)
      plane.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOverTrigger, () => {
        plane.material!.alpha = .5
      }))
      plane.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPointerOutTrigger, () => {
        plane.material!.alpha = 1
      }))
      plane.actionManager.registerAction(new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
        click()
      }))
    }

    return plane
  }

  private box(xRes = 1024, aspect = .215, padding = .015): AbstractMesh {
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
    mat.alpha = .95

    const w = 1 - padding * 2
    const h = w * aspect

    const plane = MeshBuilder.CreatePlane('Text', { width: w, height: h, updatable: false }, this.scene)
    plane.material = mat
    // plane.rotation.x = Math.PI / 2
    plane.position = new Vector3(w / 2 + padding, h / 2 + padding, 1)

    plane.enablePointerMoveEvents = true

    return plane
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
