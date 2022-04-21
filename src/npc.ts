import { AbstractMesh, TransformNode } from "@babylonjs/core";

export class Npc {

  npcs = new Array<AbstractMesh | TransformNode>()

  addFromMeshes(meshes: Array<AbstractMesh>) {
    meshes.forEach(mesh => {
      if (!!this.getNpcData(mesh)) {
        this.npcs.push(mesh)
      }
    })
  }

  addFromTransformNodes(nodes: Array<TransformNode>) {
    nodes.forEach(node => {
      if (!!this.getNpcData(node)) {
        this.npcs.push(node)
      }
    })
  }

  getNpcData(npc: AbstractMesh | TransformNode): string {
    return Npc.getNpcNode(npc)?.metadata?.gltf?.extras?.npc || ''
  }

  private static getNpcNode(npc: AbstractMesh | TransformNode): TransformNode | undefined {
    return npc.getChildTransformNodes(true, node => node.name.startsWith('NPC'))?.[0]
  }
}
