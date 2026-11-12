import { InjectionToken, Signal } from '@angular/core';

export interface DcWeekNumbersIntl {
  /** Accessible name of the group of week numbers, read by screen readers. */
  weekNumbers: string;
  /** Visible caption in front of the week numbers (keep it short, e.g. "Wk"). */
  week: string;
}

export const DC_WEEK_NUMBERS_INTL = new InjectionToken<Signal<DcWeekNumbersIntl>>(
  'DC_WEEK_NUMBERS_INTL',
);
