import { Ui } from "../ui";
import { RachelStory } from "./rachel.story";
import { AmandaStory } from "./amanda.story";
import { StoryInterface } from "./story.interface";
import { GroupOfGirlsStory } from "./groupOfGirls.story";
import { AmberStory } from "./amber.story";
import { HeatherStory } from "./heather.story";
import { BaileyStory } from "./bailey.story";
import { StephanieStory } from "./stephanie.story";
import { Sign1Story } from "./sign1.story";
import { AlexStory } from "./alex.story";

export class Story {

  private readonly stories: { [ key: string ]: StoryInterface } = {
    ['amanda']: new AmandaStory(),
    ['rachel']: new RachelStory(),
    ['group of girls']: new GroupOfGirlsStory(),
    ['amber']: new AmberStory(),
    ['heather']: new HeatherStory(),
    ['bailey']: new BaileyStory(),
    ['stephanie']: new StephanieStory(),
    ['sign 1']: new Sign1Story(),
    ['alex']: new AlexStory(),
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
