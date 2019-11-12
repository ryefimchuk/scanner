import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import DefaultConfigLoader from '../default-config-loader';
import DefaultLogger from '../default-logger';
import DefaultSpinner from '../default-spinner';
import { IConfigLoader, ILogger, ISpinner } from '../interfaces';
import { IConfig } from '../models';

const configLoader: IConfigLoader = new DefaultConfigLoader();
const config: IConfig = configLoader.loadConfig();
const logger: ILogger = new DefaultLogger(`./.logs/fake-scan-builder`);

const initJSONLocation: string = path.resolve(config.monitorFolder, config.inputJSONName);
const doneJSONLocation: string = path.resolve(config.monitorFolder, config.doneJSONName);
const spinner: ISpinner = new DefaultSpinner();

function checkInputJSON(): void {

  spinner.setText('Waiting for new scan');

  if (fs.existsSync(doneJSONLocation)) {
    scheduleNextCheck();
    return;
  }
  if (fs.existsSync(initJSONLocation)) {

    const json: any = JSON.parse(fs.readFileSync(initJSONLocation, 'utf-8'));

    spinner.clear();
    spinner.stop();
    process.stdin.resume();
    process.stdout.write(`New scan ${json.scanid} is found, press <Enter> to build scan`);
    process.stdin.once('data', (): void => {
      fs.unlinkSync(initJSONLocation);
      fs.writeFileSync(doneJSONLocation, JSON.stringify(json), {
        encoding: 'utf-8',
      });
      logger.info(`Scan ${json.scanid} has been built`);
      spinner.start();
      scheduleNextCheck();
    });
    return;
  }
  scheduleNextCheck();
}

function scheduleNextCheck(): void {
  setTimeout((): void => {
    checkInputJSON();
  }, config.updateInterval);
}

logger.debug(chalk.green('> Fake scan builder running'));
spinner.start();

checkInputJSON();
