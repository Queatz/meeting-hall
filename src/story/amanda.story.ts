import { StoryControls, StoryInterface, StoryOptions } from "./story.interface";

export class AmandaStory implements StoryInterface {

  name = 'Amanda'

  next(controls: StoryControls, data: any): StoryOptions {
    return {
      text: 'Hi?',
      options: [
        [ 'I want to know more about George', () => { controls.end() } ],
        [ 'Can you tell me something about Samantha?', () => { controls.end() } ],
        [ 'Where do you like to hang out?', () => { controls.end() } ],
      ] as Array<[string, () => void]>
    }
  }
}
