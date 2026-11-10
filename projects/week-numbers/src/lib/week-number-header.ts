import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  isDevMode,
  Type,
  ViewEncapsulation,
} from '@angular/core';
import { MatCalendarHeader } from '@angular/material/datepicker';
import { DcWeekNumbersController } from './week-numbers-controller';
import { DC_WEEK_NUMBERS_HOST } from './week-numbers-host';

/**
 * Calendar header = header (standard Material one or an alternative) + week number column.
 *
 * - `<mat-datepicker dcWeekNumbers>`               → standard Material header
 * - `<mat-datepicker [dcWeekNumbers]="MyHeader">`  → `MyHeader`, rendered inside
 *
 * The alternative header is created with the calendar's injector: it can inject
 * `MatCalendar`, `DateAdapter`… exactly like a regular `calendarHeaderComponent`.
 *
 * Styles are global (`ViewEncapsulation.None`) because a datepicker calendar is rendered
 * in the CDK overlay: nothing to import on the application side.
 */
@Component({
  selector: 'dc-week-number-header',
  imports: [NgComponentOutlet],
  hostDirectives: [DcWeekNumbersController],
  template: `<ng-container *ngComponentOutlet="header()" />`,
  styleUrl: './week-numbers.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DcWeekNumberHeader {
  private readonly host = inject(DC_WEEK_NUMBERS_HOST, { optional: true });

  protected readonly header = computed<Type<unknown>>(() => {
    const inner = this.host?.innerHeader() ?? null;
    if (inner === DcWeekNumberHeader) {
      // [dcWeekNumbers]="DcWeekNumberHeader" → infinite recursion
      if (isDevMode()) {
        console.warn('[dcWeekNumbers] DcWeekNumberHeader cannot wrap itself.');
      }
      return MatCalendarHeader;
    }
    return inner ?? MatCalendarHeader;
  });
}
