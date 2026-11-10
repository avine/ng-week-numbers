import { Injectable, signal } from '@angular/core';

/**
 * Labels of the week number column.
 * To translate them: provide a subclass, or update the signals at runtime
 * (an open calendar updates automatically).
 *
 * ```ts
 * { provide: DcWeekNumbersIntl, useClass: MyWeekNumbersIntl }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class DcWeekNumbersIntl {
  /** Visible column header (keep it short, the column is narrow). */
  readonly columnHeader = signal('S');

  /** Column header read by screen readers. */
  readonly columnHeaderLabel = signal('Numéro de semaine');

  /** Accessible label of each week cell. */
  readonly weekLabel = signal((week: number) => `Semaine ${week}`);
}
