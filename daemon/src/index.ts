import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import DefaultBuilderFeeder from './default-builder-feeder';
import DefaultConfigLoader from './default-config-loader';
import DefaultLogger from './default-logger';
import DefaultSpinner from './default-spinner';
import { IBuilderFeeder, IConfigLoader, ILogger } from './interfaces';
import { IConfig } from './models';

const logger: ILogger = new DefaultLogger();

try {

  const configLoader: IConfigLoader = new DefaultConfigLoader();
  const config: IConfig = configLoader.loadConfig();

  try {

    const inputRootFolder: string = path.resolve(config.inputRootFolder);
    const monitorFolder: string = path.resolve(config.monitorFolder);

    if (!fs.existsSync(inputRootFolder)) {
      throw new Error(`Root Folder ${inputRootFolder} doesn't exist`);
    }

    if (!fs.existsSync(monitorFolder)) {
      throw new Error(`Monitor folder ${monitorFolder} doesn't exist`);
    }

    const builderFeeder: IBuilderFeeder = new DefaultBuilderFeeder(
      {
        ...config,
        inputRootFolder,
        monitorFolder,
      },
      logger,
      new DefaultSpinner(),
    );
    logger.debug(chalk.green('> Builder feeder running'));
    logger.debug(`${chalk.yellow('Node Version = ')}${chalk.cyan(process.version)}`);
    logger.debug(`${chalk.yellow('Root Folder = ')}${chalk.cyan(inputRootFolder)}`);
    logger.debug(`${chalk.yellow('Monitor Folder = ')}${chalk.cyan(monitorFolder)}`);
    logger.debug(`${chalk.yellow('Update Interval = ')}${chalk.cyan('' + config.updateInterval)}`);
    logger.debug(`${chalk.yellow('Logs = ')}${chalk.cyan('' + logger.logsFolder)}`);
    builderFeeder.start();
  } catch (e) {
    logger.error(`Unable to start, reason = ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
  }
} catch (e) {
  logger.error(`Unable to load config.json, reason = ${JSON.stringify(e, Object.getOwnPropertyNames(e))}`);
}
