import { EnvironmentProviders, InjectionToken, makeEnvironmentProviders } from '@angular/core';
import { DcWeekNumberFn, dcIsoWeekNumber } from './week-number-fns';

/**
 * Computes the week number of a calendar row. Defaults to ISO 8601 (`dcIsoWeekNumber`).
 *
 * Prefer `provideDcWeekNumberFn()` (type-checked). Provide the token directly only when the
 * strategy depends on another injectable, e.g. one per build with Angular i18n:
 *
 * ```ts
 * {
 *   provide: DC_WEEK_NUMBER_FN,
 *   useFactory: () => (inject(LOCALE_ID) === 'en-US' ? dcLocaleWeekNumber : dcIsoWeekNumber),
 * }
 * ```
 */
export const DC_WEEK_NUMBER_FN = new InjectionToken<DcWeekNumberFn>('DC_WEEK_NUMBER_FN', {
  providedIn: 'root',
  factory: () => dcIsoWeekNumber,
});

/**
 * Overrides the week numbering.
 *
 * ```ts
 * provideDcWeekNumberFn(dcLocaleWeekNumber) // locale numbering (e.g. US)
 * ```
 */
export function provideDcWeekNumberFn(weekNumberFn: DcWeekNumberFn): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: DC_WEEK_NUMBER_FN, useValue: weekNumberFn }]);
}
