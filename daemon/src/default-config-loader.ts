import Ajv from 'ajv';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs';

import configSchema from '../lib/config-schema.json';
import { IConfigLoader } from './interfaces';
import { IConfig, IConfigArgs } from './models';

export default class DefaultConfigLoader implements IConfigLoader {

  private readonly configArgs: yargs.Argv<IConfigArgs> = yargs as yargs.Argv<IConfigArgs>;

  constructor() {
    this.configArgs.alias('c', 'config');
  }

  public loadConfig(): IConfig {

    type RawConfig = Partial<IConfig> & {
      extends?: string;
    };
    const configName: string = this.configArgs.argv.config || 'config.json';

    let config: RawConfig;
    let configPath: string = path.resolve(process.cwd(), configName);

    while (true) {

      const rawConfig: RawConfig = JSON.parse(
        fs.readFileSync(configPath, 'utf-8'),
      ) as RawConfig;

      config = {
        ...rawConfig,
        ...(config || {}),
      };

      if (config.extends) {
        configPath = path.resolve(process.cwd(), config.extends);
        delete config.extends;
        continue;
      }
      break;
    }

    const ajv: Ajv.Ajv = new Ajv();
    const validate: Ajv.ValidateFunction = ajv.compile(configSchema);
    if (!validate(config)) {
      throw new Error(ajv.errorsText(validate.errors));
    }

    return config as IConfig;
  }
}
