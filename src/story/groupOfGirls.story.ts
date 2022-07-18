import { StoryControls, StoryInterface, StoryOptions } from "./story.interface";

export class GroupOfGirlsStory implements StoryInterface {

  name = 'Group of girls'

  next(controls: StoryControls, data: any): StoryOptions {
    return {
      text: 'The girls are talking in hushed voices.',
      options: [
        [ 'Hey, what\'s going on over here?', () => { controls.next({
          text: 'Hi.  We\'re chatting.',
          options: [
            [ 'Gotcha', () => { controls.restart() } ]
          ] as Array<[string, () => void]>
        }) } ],
        [ 'Sorry to interrupt, but have you seen Amanda?', () => { controls.next({
          text: 'She went to the beach this morning',
          options: [
            [ 'Cool, thanks', () => { controls.restart() } ],
            [ 'Oh okay, do you know when she\'ll be back?', () => { controls.end() } ]
          ] as Array<[string, () => void]>
        }) } ]
      ]
    }
  }
}
