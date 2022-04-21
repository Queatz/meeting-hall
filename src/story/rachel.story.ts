import { StoryControls, StoryInterface, StoryOptions } from "./story.interface";

export class RachelStory implements StoryInterface {

  name = 'Rachel'

  next(controls: StoryControls, data: any): StoryOptions {
    return {
      text: 'Hey, how are you doing today?',
      options: [
        [ 'I want to know more about Amanda', () => { controls.next({
          text: 'She\'s kinda cool.  Kinda.',
          options: [
            [ 'Gotcha', () => { controls.restart() } ]
          ] as Array<[string, () => void]>
        }) } ],
        [ 'Where\'s the will?', () => { controls.next({
          text: 'In the way',
          options: [
            [ 'Lol!', () => { controls.restart() } ],
            [ 'Ok then byeee', () => { controls.end() } ]
          ] as Array<[string, () => void]>
        }) } ],
        [ 'Where do you like to hang out?', () => { controls.next({
          text: 'In the pool',
          options: [
            [ 'Ok', () => { controls.restart() } ]
          ] as Array<[string, () => void]>
        }) } ],
      ] as Array<[string, () => void]>
    }
  }
}
