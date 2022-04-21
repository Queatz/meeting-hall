export interface StoryInterface {
  name: string

  next(controls: StoryControls, data: any): StoryOptions
}

export type StoryControls = { end: () => void, next: (options: StoryOptions) => void, restart: () => void }

export type StoryOptions = { text: string, options: Array<[string, () => void]> }
