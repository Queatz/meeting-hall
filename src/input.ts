import {Scene, KeyboardEventTypes} from '@babylonjs/core'

export class PlayerInput {

  private readonly inputMap = new Map<string, boolean>()
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
  }

  key(key: string): boolean {
    return !!this.inputMap.get(key)
  }
}
