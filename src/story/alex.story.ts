import { StoryControls, StoryInterface, StoryOptions } from "./story.interface";

export class AlexStory implements StoryInterface {

  name = 'Alex'

  next(controls: StoryControls, data: any): StoryOptions {
    return {
      text: 'Yo',
      options: [
        [ 'Yo', () => { controls.end() } ]
      ] as Array<[string, () => void]>
    }
  }
}
