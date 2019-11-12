import chalk from 'chalk';
import fs from 'fs';
import _ from 'lodash';
import path from 'path';
import { of, Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';

import { BuilderStatus } from './enums';
import { IBuilderFeeder, ILogger, ISpinner } from './interfaces';
import { ICityConfig, IConfig, IUnprocessedScan } from './models';

function getSortedFolders(parentFolder: string, folders: string[]): string[] {
  if (folders.length === 1) {
    return folders;
  }
  return _.sortBy(folders, (folder: string): number => +fs.statSync(path.resolve(parentFolder, folder)).mtime);
}

export default class DefaultBuilderFeeder implements IBuilderFeeder {

  private readonly initJSONLocation: string;
  private readonly doneJSONLocation: string;
  private nextUpdateSubscription: Subscription;

  constructor(
    private config: IConfig,
    private logger: ILogger,
    private spinner: ISpinner,
  ) {
    this.initJSONLocation = path.resolve(config.monitorFolder, config.inputJSONName);
    this.doneJSONLocation = path.resolve(config.monitorFolder, config.doneJSONName);
  }

  public start(): void {
    this.update();
    this.spinner.start();
  }

  public stop(): void {
    this.clearNextUpdate();
  }

  private update(): void {
    this.clearNextUpdate();
    switch (this.getBuilderStatus()) {
      case BuilderStatus.Available: {
        const unprocessedScan: IUnprocessedScan = this.getNextUnprocessedScan();
        if (unprocessedScan) {
          this.info(
            `Scan ${chalk.yellowBright(unprocessedScan.scanId)} for city ${chalk.yellowBright(
              unprocessedScan.cityId,
            )} is ready for been eaten`,
          );
          this.copyJSON(unprocessedScan.inputJSONPath, unprocessedScan.cityId, unprocessedScan.cityConfig);
          setTimeout((): void => {
            this.update();
          }, 0);
        } else {
          this.spinner.setText('Builder is hungry, waiting for new scan');
          this.scheduleNextUpdate();
        }
        break;
      }
      case BuilderStatus.Busy: {
        this.spinner.setText('Builder is eating');
        this.scheduleNextUpdate();
        break;
      }
    }
  }

  private scheduleNextUpdate(): void {
    this.nextUpdateSubscription = of(void 0).pipe(
      delay(this.config.updateInterval),
    ).subscribe((): void => {
      this.update();
    });
  }

  private clearNextUpdate(): void {
    if (this.nextUpdateSubscription) {
      this.nextUpdateSubscription.unsubscribe();
      delete this.nextUpdateSubscription;
    }
  }

  private info(text: string): void {
    this.spinner.clear();
    this.logger.info(text);
  }

  private error(text: string, error: any): void {
    this.spinner.clear();
    this.logger.error(text + ', reason = ' + JSON.stringify(error, Object.getOwnPropertyNames(error)));
  }

  private getBuilderStatus(): BuilderStatus {
    if (fs.existsSync(this.doneJSONLocation)) {
      fs.unlinkSync(this.doneJSONLocation);
      return BuilderStatus.Available;
    }
    if (!fs.existsSync(this.initJSONLocation)) {
      return BuilderStatus.Available;
    }
    return BuilderStatus.Busy;
  }

  private getNextUnprocessedScan(): IUnprocessedScan {
    try {
      const cityIds: string[] = getSortedFolders(
        this.config.inputRootFolder,
        fs.readdirSync(this.config.inputRootFolder),
      );
      for (const cityId of cityIds) {
        const cityFolder: string = path.resolve(this.config.inputRootFolder, cityId);
        const cityConfig: Partial<ICityConfig> = this.getCityConfig(cityId);
        try {
          const scanIds: string[] = getSortedFolders(cityFolder, fs.readdirSync(cityFolder));
          loop: for (const scanId of scanIds) {
            const scanFolder: string = path.resolve(this.config.inputRootFolder, cityId, scanId);
            const doneJSONPath: string = path.resolve(scanFolder, this.config.doneJSONName);
            if (fs.existsSync(doneJSONPath)) {
              continue;
            }
            for (const requiredFolder of cityConfig.requiredFolders || []) {
              const absolutePath: string = path.resolve(scanFolder, requiredFolder);
              if (!fs.existsSync(absolutePath)) {
                continue loop;
              }
            }
            const inputJSONPath: string = path.resolve(scanFolder, this.config.inputJSONName);
            if (fs.existsSync(inputJSONPath)) {
              return { cityId, scanId, inputJSONPath, cityConfig };
            }
          }
        } catch (e) {
          this.error(`Error during ${cityFolder} directory scanning`, e);
        }
      }
    } catch (e) {
      this.error(`Error during ${this.config.inputRootFolder} directory scanning`, e);
    }
    return null;
  }

  private getCityConfig(cityId: string): Partial<ICityConfig> {
    return (this.config.cityConfigs || {})[cityId] || {};
  }

  private copyJSON(newJSON: string, cityId: string, cityConfig: Partial<ICityConfig>): void {
    // copy new JSON to Builder directory
    const json: any = JSON.parse(fs.readFileSync(newJSON, 'utf-8'));
    fs.writeFileSync(
      this.initJSONLocation,
      JSON.stringify(
        {
          ...json,
          cityConfig: {
            city: cityId,
            ...cityConfig,
          },
        },
        null,
        2,
      ), {
        encoding: 'utf-8',
      },
    );
    fs.writeFileSync(newJSON + '.done', JSON.stringify(json), {
      encoding: 'utf-8',
    });
  }
}
