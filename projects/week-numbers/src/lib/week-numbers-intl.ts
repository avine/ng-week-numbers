import { InjectionToken, Signal } from '@angular/core';

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

export const DC_WEEK_NUMBERS_INTL = new InjectionToken<Signal<DcWeekNumbersIntl>>(
  'DC_WEEK_NUMBERS_INTL',
);
