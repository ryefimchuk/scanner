import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import DefaultConfigLoader from '../default-config-loader';
import DefaultLogger from '../default-logger';
import { IConfigLoader, ILogger } from '../interfaces';
import { ICityConfig, IConfig } from '../models';

const configLoader: IConfigLoader = new DefaultConfigLoader();
const config: IConfig = configLoader.loadConfig();
const logger: ILogger = new DefaultLogger(`./.logs/fake-scan-generator`);

function getRandomCityId(): string {
  const cityIds: string[] = Object.keys(config.cityConfigs);
  return cityIds[Math.floor(Math.random() * cityIds.length)];
}

function generateNextScan(): void {
  process.stdin.resume();
  process.stdout.write(`Press <Enter> to generate next scan`);
  process.stdin.once('data', (): void => {
    const scanId: number = Date.now();
    const cityId: string = getRandomCityId();
    const cityFolder: string = path.resolve(config.inputRootFolder, cityId);
    if (!fs.existsSync(cityFolder)) {
      fs.mkdirSync(cityFolder);
    }
    const scanFolder: string = path.resolve(cityFolder, scanId.toString());
    if (!fs.existsSync(scanFolder)) {
      fs.mkdirSync(scanFolder);
    }
    const cityConfig: Partial<ICityConfig> = config.cityConfigs[cityId];
    if (cityConfig && cityConfig.requiredFolders) {
      for (const requiredFolder of cityConfig.requiredFolders) {
        fs.mkdirSync(path.resolve(scanFolder, requiredFolder));
      }
    }
    fs.writeFileSync(path.resolve(scanFolder, config.inputJSONName), JSON.stringify({
      'city': 'S',
      'clientid': null,
      'comments': 'comments',
      'emptydir': path.resolve(config.inputRootFolder, scanId.toString(), 'normal'),
      'firstName': '',
      'height': '165',
      'lastName': '',
      'normaldir': path.resolve(config.inputRootFolder, scanId.toString(), 'normal'),
      'projectdir': path.resolve(config.inputRootFolder, scanId.toString(), 'projection'),
      'savedir': config.inputRootFolder,
      'scanid': scanId,
      'size': '1',
      'weight': '55',
    }, null, 2), {
      encoding: 'utf-8',
    });
    logger.info(`Scan ${scanId} for city ${cityId} has been generated`);
    generateNextScan();
  });
}

logger.debug(chalk.green('> Fake scan generator running'));

generateNextScan();
