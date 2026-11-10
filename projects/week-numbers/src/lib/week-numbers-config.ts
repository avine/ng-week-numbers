import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import {
  DcWeekNumberFn,
  DcWeekNumberFormatFn,
  dcFormatWeekNumber,
  dcIsoWeekNumber,
} from './week-number-fns';

export interface DcWeekNumbersConfig {
  /** Computes the week number of a row. Defaults to ISO 8601 (`dcIsoWeekNumber`). */
  weekNumberFn: DcWeekNumberFn;
  /** Formats the displayed number. Defaults to the same digits as the day cells. */
  formatWeekNumber: DcWeekNumberFormatFn;
}

const DEFAULT_CONFIG: DcWeekNumbersConfig = {
  weekNumberFn: dcIsoWeekNumber,
  formatWeekNumber: dcFormatWeekNumber,
};

export const DC_WEEK_NUMBERS_CONFIG = new InjectionToken<DcWeekNumbersConfig>(
  'DC_WEEK_NUMBERS_CONFIG',
  { providedIn: 'root', factory: () => DEFAULT_CONFIG },
);

/**
 * Optional configuration override.
 *
 * ```ts
 * provideDcWeekNumbers({ weekNumberFn: dcLocaleWeekNumber }) // locale numbering (e.g. US)
 * ```
 */
export function provideDcWeekNumbers(config: Partial<DcWeekNumbersConfig>): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: DC_WEEK_NUMBERS_CONFIG, useValue: { ...DEFAULT_CONFIG, ...config } },
  ]);
}
