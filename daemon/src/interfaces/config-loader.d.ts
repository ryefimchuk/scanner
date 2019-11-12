import { IConfig } from '../models';

export interface IConfigLoader {
  loadConfig(): IConfig;
}
