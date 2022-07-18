import { StoryControls, StoryInterface, StoryOptions } from "./story.interface";

export class AmberStory implements StoryInterface {

  name = 'Amber'

  next(controls: StoryControls, data: any): StoryOptions {
    return {
      text: 'Hi?',
      options: [
        [ 'I want to know more about Bailey', () => { controls.end() } ],
      ] as Array<[string, () => void]>
    }
  }
}
