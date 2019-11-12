export interface ILogger {

  readonly logsFolder: string;

  debug(message: string): void;

  info(message: string): void;

  error(message: string): void;
}
