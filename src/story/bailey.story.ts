import { StoryControls, StoryInterface, StoryOptions } from "./story.interface";

export class BaileyStory implements StoryInterface {

  name = 'Bailey'

  next(controls: StoryControls, data: any): StoryOptions {
    return {
      text: 'Hi?',
      options: [
        [ 'I want to know more about Dandy', () => { controls.end() } ],
      ] as Array<[string, () => void]>
    }
  }
}
