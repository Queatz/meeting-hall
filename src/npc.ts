import { AbstractMesh, TransformNode } from "@babylonjs/core";

export class Npc {

  npcs = new Array<TransformNode>()

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

  getNpcData(npc: TransformNode): string {
    return Npc.getNpcNode(npc)?.metadata?.gltf?.extras?.npc || ''
  }

  private static getNpcNode(npc: TransformNode): TransformNode | undefined {
    if (npc.name.startsWith('NPC')) return npc
    return npc.getChildTransformNodes(true, node => node.name.startsWith('NPC'))?.[0]
  }
}
