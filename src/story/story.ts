import { Ui } from "../ui";
import { RachelStory } from "./rachel.story";
import { AmandaStory } from "./amanda.story";
import { StoryInterface } from "./story.interface";

export class Story {

  private readonly stories: { [ key: string ]: StoryInterface } = {
    amanda: new AmandaStory(),
    rachel: new RachelStory(),
  }

  private readonly data: any = {}

  constructor(private ui: Ui) {
  }

  show(npcName: string) {
    const npc = this.stories[npcName]

    if (!npc) {
      return
    }

    const next = npc.next({
      end: () => { this.ui.clear() },
      next: options => { this.ui.conversation(npc.name, options.text, options.options) },
      restart: () => { this.show(npcName) }
    }, this.data)

    this.ui.conversation(npc.name, next.text, next.options)
  }
}
