import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, isDevMode, Type, ViewEncapsulation } from '@angular/core';
import { MatCalendarHeader } from '@angular/material/datepicker';
import { DcWeekNumbersController } from './week-numbers-controller';
import { DC_WEEK_NUMBERS_HOST } from './week-numbers-host';

/**
 * Calendar header = header (standard Material one or an alternative) + week number column.
 *
 * - `<mat-datepicker dcWeekNumbers>`               → standard Material header
 * - `<mat-datepicker dcWeekNumbers [dcWeekNumbersCalendarHeader]="MyHeader">`  → `MyHeader`, rendered inside
 *
 * The alternative header is created with the calendar's injector: it can inject
 * `MatCalendar`, `DateAdapter`… exactly like a regular `calendarHeaderComponent`.
 *
 * Styles are global (`ViewEncapsulation.None`) because a datepicker calendar is rendered
 * in the CDK overlay: nothing to import on the application side.
 */
@Component({
  selector: 'dc-week-number-header',
  hostDirectives: [DcWeekNumbersController],
  imports: [NgComponentOutlet],
  template: `<ng-container *ngComponentOutlet="calendarHeader()" />`,
  styleUrl: './week-numbers.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DcWeekNumberHeader {
  private readonly host = inject(DC_WEEK_NUMBERS_HOST, { optional: true });

  protected readonly calendarHeader = computed<Type<unknown>>(() => {
    const hostCalendarHeader = this.host?.calendarHeader() ?? null;
    if (hostCalendarHeader === DcWeekNumberHeader) {
      // dcWeekNumbers [dcWeekNumbersCalendarHeader]="DcWeekNumberHeader" → infinite recursion
      if (isDevMode()) {
        console.warn('[dcWeekNumbers] DcWeekNumberHeader cannot wrap itself.');
      }
      return MatCalendarHeader;
    }
    return hostCalendarHeader ?? MatCalendarHeader;
  });
}
