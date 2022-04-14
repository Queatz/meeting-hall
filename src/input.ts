import { Scene, KeyboardEventTypes, PointerEventTypes } from '@babylonjs/core'

export class PlayerInput {

  private readonly inputMap = new Map<string, boolean>()
  private readonly mouseMap = new Map<number, boolean>()
  private readonly _scene: Scene

  constructor(scene: Scene) {
    this._scene = scene

    scene.onKeyboardObservable.add(eventData => {
      switch (eventData.type) {
        case KeyboardEventTypes.KEYDOWN:
          this.inputMap.set(eventData.event.key, true)
          break
        case KeyboardEventTypes.KEYUP:
          this.inputMap.set(eventData.event.key, false)
          break
      }
    })

    scene.onPointerObservable.add(eventData => {
      switch (eventData.type) {
        case PointerEventTypes.POINTERDOWN:
          this.mouseMap.set(eventData.event.button, true)
          break
        case PointerEventTypes.POINTERUP:
          this.mouseMap.set(eventData.event.button, false)
          break
      }
    })
  }

  key(key: string): boolean {
    return !!this.inputMap.get(key)
  }

  button(button: number): boolean {
    return !!this.mouseMap.get(button)
  }
}
