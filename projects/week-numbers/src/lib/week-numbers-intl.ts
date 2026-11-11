import { InjectionToken, Signal } from '@angular/core';

export interface DcWeekNumbersIntl {
  /** Visible column header (keep it short, the column is narrow). */
  shortWeek: string;
  /** Column header read by screen readers. */
  week: string;
  /** Accessible label of each week cell. */
  weekNumber: (week: number) => string;
}

export const DC_WEEK_NUMBER_INTL = new InjectionToken<Signal<DcWeekNumbersIntl>>(
  'DC_WEEK_NUMBER_INTL',
);
