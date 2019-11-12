import _ from 'lodash';

import { ICityConfig } from './city-config';

export interface IConfig {
  inputRootFolder: string;
  monitorFolder: string;
  inputJSONName: string;
  doneJSONName: string;
  updateInterval: number;
  cityConfigs: _.Dictionary<Partial<ICityConfig>>;
}
