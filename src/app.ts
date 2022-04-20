import '@babylonjs/core/Debug/debugLayer'
import '@babylonjs/inspector'
import '@babylonjs/loaders/glTF'
import { Engine, Scene } from '@babylonjs/core'
import { World } from "./world"
import { Ui } from "./ui"

class App {
  constructor() {
    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.id = 'gameCanvas'
    document.body.appendChild(canvas)

    setTimeout(() => canvas.focus())

    const engine = new Engine(canvas, true)
    const scene = new Scene(engine)
    const world = new World(scene, engine, canvas)

    const ui = new Ui(engine)

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
      if (!world.ready) {
        return
      }

      world.update()
      scene.render()
      ui.render()
    })

    window.addEventListener('resize', () => {
      engine.resize()
    })
  }
}

new App()
