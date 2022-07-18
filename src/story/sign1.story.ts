import { StoryControls, StoryInterface, StoryOptions } from "./story.interface";

export class Sign1Story implements StoryInterface {

  name = 'Sign'

  next(controls: StoryControls, data: any): StoryOptions {
    return {
      text: 'Check out Jacob\'s life advice this way',
      options: [
        [ 'Close', () => { controls.end() } ],
      ] as Array<[string, () => void]>
    }
  }
}
