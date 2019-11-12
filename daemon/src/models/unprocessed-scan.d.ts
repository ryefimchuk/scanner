import { ICityConfig } from './city-config';

export interface IUnprocessedScan {
  cityId: string;
  scanId: string;
  inputJSONPath: string;
  cityConfig: Partial<ICityConfig>;
}
