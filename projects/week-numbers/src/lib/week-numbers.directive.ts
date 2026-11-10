import { afterNextRender, Directive, inject, input, isDevMode, Type } from '@angular/core';
import { MatCalendar, MatDatepicker, MatDateRangePicker } from '@angular/material/datepicker';
import { DcWeekNumberHeader } from './week-number-header';
import { DC_WEEK_NUMBERS_HOST, DcWeekNumbersHost } from './week-numbers-host';

/**
 * Adds the week number column to a datepicker, a date range picker or an inline calendar.
 *
 * ```html
 * <mat-datepicker dcWeekNumbers />
 * <mat-date-range-picker dcWeekNumbers />
 * <mat-calendar dcWeekNumbers />
 *
 * <!-- with an alternative header (replaces [calendarHeaderComponent] / [headerComponent]) -->
 * <mat-datepicker [dcWeekNumbers]="MyHeader" />
 * ```
 *
 * The directive takes over the calendar's header slot: a custom header must therefore be
 * passed to the directive, not to `[calendarHeaderComponent]` (which would override it).
 */
@Directive({
  selector:
    'mat-datepicker[dcWeekNumbers], mat-date-range-picker[dcWeekNumbers], mat-calendar[dcWeekNumbers]',
  providers: [{ provide: DC_WEEK_NUMBERS_HOST, useExisting: DcWeekNumbers }],
})
export class DcWeekNumbers implements DcWeekNumbersHost {
  /** Alternative header displayed above the calendar. Empty → standard Material header. */
  readonly calendarHeader = input(null, {
    alias: 'dcWeekNumbers',
    transform: (value: Type<unknown> | '' | null | undefined): Type<unknown> | null =>
      value || null,
  });

  private readonly picker =
    inject(MatDatepicker, { self: true, optional: true }) ??
    inject(MatDateRangePicker, { self: true, optional: true });

  private readonly calendar = inject(MatCalendar, { self: true, optional: true });

  constructor() {
    this.setHeaderComponent(DcWeekNumberHeader);

    if (isDevMode()) {
      // Template inputs are applied after the constructor: a [calendarHeaderComponent] /
      // [headerComponent] bound on top of the directive would have overridden our header.
      afterNextRender(() => {
        if (this.getHeaderComponent() !== DcWeekNumberHeader) {
          console.warn(
            '[dcWeekNumbers] The calendar header has been overridden, week numbers will not be ' +
              'displayed. Pass the header to the directive instead: [dcWeekNumbers]="MyHeader".',
          );
        }
      });
    }
  }

  private setHeaderComponent(headerComponent: Type<unknown>): void {
    if (this.picker) {
      this.picker.calendarHeaderComponent = headerComponent;
    } else if (this.calendar) {
      this.calendar.headerComponent = headerComponent;
    }
  }

  private getHeaderComponent(): unknown {
    return this.picker ? this.picker.calendarHeaderComponent : this.calendar?.headerComponent;
  }
}
