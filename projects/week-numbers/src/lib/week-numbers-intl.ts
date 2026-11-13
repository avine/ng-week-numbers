import { InjectionToken, type Provider, type Signal } from '@angular/core';

export interface DcWeekNumbersIntl {
  /** Accessible name of the group of week numbers, read by screen readers. */
  weekNumbers: string;
  /** Visible caption in front of the week numbers (keep it short, e.g. "Wk"). */
  week: string;
  /**
   * Accessible label of each week button, read by screen readers, e.g. "Week 46, 9 – 15".
   * - `week` is the raw week number: written with Latin digits when interpolated as is. To use
   *   the locale's digits, format it, e.g. `week.toLocaleString('ar-EG')` → "٤٦".
   * - `dayRange` is the range of days of the displayed month in the week ("9 – 15", or "1" when
   *   the week has a single day in the month), already written like the day cells ("٩ – ١٥" in
   *   `ar-EG`); it is also the tooltip.
   */
  formatWeekLabel: (week: number, dayRange: string) => string;
}

/**
 * Labels of the week ruler. Required, no default: the application provides them, in its own
 * language, with `provideDcWeekNumbersIntl()`. Without them, creating the ruler throws a
 * `NullInjectorError` for `DC_WEEK_NUMBERS_INTL`.
 *
 * Prefer `provideDcWeekNumbersIntl()` (type-checked). Provide the token directly only when the
 * labels depend on another injectable (e.g. an i18n library such as ngx-translate).
 */
export const DC_WEEK_NUMBERS_INTL = new InjectionToken<Signal<DcWeekNumbersIntl>>(
  'DC_WEEK_NUMBERS_INTL',
);

/**
 * Provides the labels, for the whole application or for the calendars of a single component.
 * To switch language at runtime, set a new object on the signal: an open calendar updates.
 *
 * ```ts
 * provideDcWeekNumbersIntl(signal({ weekNumbers: 'Numéros de semaine', week: 'Sem.', … }))
 * ```
 */
export const provideDcWeekNumbersIntl = (intl: Signal<DcWeekNumbersIntl>): Provider[] => [
  {
    provide: DC_WEEK_NUMBERS_INTL,
    useValue: intl,
  },
];
