import { InjectionToken, type Provider } from '@angular/core';
import { dcIsoWeekNumber, type DcWeekNumberFn } from './week-numbers-strategies';

/**
 * Computes the number of the week that contains a date, which also defines the days of each
 * week button. Defaults to ISO 8601 (`dcIsoWeekNumber`).
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
 * Overrides the week numbering, for the whole application or, like `provideDateFnsAdapter()`,
 * for the calendars of a single component.
 *
 * ```ts
 * provideDcWeekNumberFn(dcLocaleWeekNumber) // locale numbering (e.g. US)
 * ```
 */
export const provideDcWeekNumberFn = (weekNumberFn: DcWeekNumberFn): Provider[] => [
  {
    provide: DC_WEEK_NUMBER_FN,
    useValue: weekNumberFn,
  },
];
