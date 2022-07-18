import { StoryControls, StoryInterface, StoryOptions } from "./story.interface";

export class StephanieStory implements StoryInterface {

  name = 'Stephanie'

  next(controls: StoryControls, data: any): StoryOptions {
    return {
      text: 'Hi?',
      options: [
        [ 'I want to know more about Stephanie', () => { controls.end() } ],
      ] as Array<[string, () => void]>
    }
  }
}
