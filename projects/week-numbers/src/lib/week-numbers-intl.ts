import { InjectionToken, signal, type Provider, type Signal } from '@angular/core';

export interface DcWeekNumbersIntl {
  /** Accessible name of the group of week numbers, read by screen readers. */
  weekNumbers: string;
  /** Visible caption in front of the week numbers (keep it short, e.g. "Wk"). */
  week: string;
  /**
   * Accessible label of each week button, read by screen readers, e.g. "Week 46, 9 – 15".
   * `days` is the range of days of the displayed month in the week ("9 – 15", or "1" when the
   * week has a single day in the month), written like the day cells; it is also the tooltip.
   */
  formatWeekLabel: (week: number, days: string) => string;
}

/** English labels, used when the application provides none. */
export const DC_WEEK_NUMBERS_INTL_EN: DcWeekNumbersIntl = {
  weekNumbers: 'Week numbers',
  week: 'Wk',
  formatWeekLabel: (week, days) => `Week ${week}, ${days}`,
};

/**
 * Labels of the week ruler. Defaults to English (`DC_WEEK_NUMBERS_INTL_EN`).
 *
 * Prefer `provideDcWeekNumbersIntl()` (type-checked). Provide the token directly only when the
 * labels depend on another injectable.
 */
export const DC_WEEK_NUMBERS_INTL = new InjectionToken<Signal<DcWeekNumbersIntl>>(
  'DC_WEEK_NUMBERS_INTL',
  {
    providedIn: 'root',
    factory: () => signal(DC_WEEK_NUMBERS_INTL_EN).asReadonly(),
  },
);

/**
 * Overrides the labels, for the whole application or for the calendars of a single component.
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
