import ora from 'ora';

import { ISpinner } from './interfaces';

export default class DefaultSpinner implements ISpinner {

  private spinner: ora.Ora = ora({
    color: 'white',
    spinner: {
      frames: ['   ', '.  ', '.. ', '...'],
      interval: 500,
    },
  });

  public setText(text: string): void {
    this.spinner.prefixText = text;
  }

  public start(): void {
    this.spinner.start();
  }

  public stop(): void {
    this.spinner.stop();
  }

  public clear(): void {
    this.spinner.clear();
  }
}
