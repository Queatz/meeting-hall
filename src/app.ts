import '@babylonjs/core/Debug/debugLayer'
import '@babylonjs/inspector'
import '@babylonjs/loaders/glTF'
import { Engine, Scene } from '@babylonjs/core'
import { World } from "./world";
import { Player } from "./player";

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
    const player = new Player(world, scene)

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
      if (!player.ready || !world.ready) {
        return
      }

      world.update()
      player.update()

      scene.render()
    })

    window.addEventListener('resize', () => {
      engine.resize()
    })
  }
}

new App()
