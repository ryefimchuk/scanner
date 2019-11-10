import chalk from 'chalk';
import moment from 'moment';
import os from 'os';
import path from 'path';
import { createLogger, format, Logger, transports } from 'winston';
import WinstonDailyRotateFile from 'winston-daily-rotate-file';
import yargs from 'yargs';

import { ILogger } from './interfaces';
import { IConfigArgs } from './models';

export default class DefaultLogger implements ILogger {

  private readonly datetimeFormat: string = 'HH:mm:ss:SSS DD/MM/YYYY';
  private readonly configArgs: yargs.Argv<IConfigArgs> = yargs as yargs.Argv<IConfigArgs>;
  private logger: Logger;

  constructor(logsFolder?: string) {
    this.configArgs.alias('l', 'logs');
    this.initLogsFolder(logsFolder);
    this.initLogger();
  }

  private _logsFolder: string;

  public get logsFolder(): string {
    return this._logsFolder;
  }

  public debug(message: string): void {
    this.logger.debug(message);
  }

  public info(message: string): void {
    this.logger.info(message);
  }

  public error(message: string): void {
    this.logger.error(message);
  }

  private initLogsFolder(logsFolder?: string): void {
    this._logsFolder = logsFolder || (this.configArgs.argv.logs || path.resolve(os.homedir(), '.scanner-daemon/.logs'));
    if (!path.isAbsolute(this._logsFolder)) {
      this._logsFolder = path.resolve(process.cwd(), this._logsFolder);
    }
  }

  private initLogger(): void {
    this.logger = createLogger({
      exitOnError: false,
      transports: [
        new transports.Console({
          format: format.combine(
            format.timestamp(),
            format.printf(({ level, message, timestamp }): string => {
              let text: string = '';
              switch (level) {
                case 'error': {
                  text = `${chalk.redBright(`[${moment(timestamp).format(this.datetimeFormat)}]`)} ${message}`;
                  break;
                }
                case 'info': {
                  text = `${chalk.greenBright(`[${moment(timestamp).format(this.datetimeFormat)}]`)} ${message}`;
                  break;
                }
                default: {
                  text = message;
                  break;
                }
              }
              return text;
            }),
          ),
          level: 'debug',
        }),
        new WinstonDailyRotateFile({
          filename: path.resolve(this.logsFolder, 'log.%DATE%.log'),
          format: format.combine(
            format.timestamp(),
            format.printf(({ level, message, timestamp }): string => {
              if (message) {
                message = message.replace(/\u001B\[([^m]*)m/g, '');
              }
              let text: string = '';
              switch (level) {
                case 'error': {
                  text = `e [${moment(timestamp).format(this.datetimeFormat)}] ${message}`;
                  break;
                }
                case 'info': {
                  text = `i [${moment(timestamp).format(this.datetimeFormat)}] ${message}`;
                  break;
                }
                default: {
                  text = message;
                  break;
                }
              }
              return text;
            }),
          ),
          level: 'info',
          maxFiles: '14d',
          maxSize: '20m',
          zippedArchive: true,
        }),
      ],
    });
  }
}
