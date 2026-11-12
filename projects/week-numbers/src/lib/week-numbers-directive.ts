import { afterNextRender, Directive, inject, isDevMode } from '@angular/core';
import { MatCalendar, MatDatepicker, MatDateRangePicker } from '@angular/material/datepicker';
import { DcWeekNumberHeader } from './week-number-header';

/**
 * Shows the week numbers in a datepicker, a date range picker or an inline calendar, without
 * exposing `DcWeekNumberHeader` to the template:
 *
 * ```html
 * <mat-datepicker dcWeekNumbers />
 * <mat-date-range-picker dcWeekNumbers />
 * <mat-calendar dcWeekNumbers />
 * ```
 *
 * Sets `DcWeekNumberHeader` as the calendar header (`calendarHeaderComponent` /
 * `headerComponent`, public Material inputs). A custom header does not need this directive:
 * embed `<dc-week-numbers-ruler />` in it and bind it to `[calendarHeaderComponent]` as usual.
 */
@Directive({
  selector:
    'mat-datepicker[dcWeekNumbers], mat-date-range-picker[dcWeekNumbers], mat-calendar[dcWeekNumbers]',
})
export class DcWeekNumbers {
  private readonly picker =
    inject(MatDatepicker, { self: true, optional: true }) ??
    inject(MatDateRangePicker, { self: true, optional: true });

  private readonly calendar = inject(MatCalendar, { self: true, optional: true });

  constructor() {
    // Before MatCalendar#ngAfterContentInit, which creates the header, and before any popup opens.
    this.setHeaderComponent(DcWeekNumberHeader);

    if (isDevMode()) {
      // Template inputs are applied after the constructor: a [calendarHeaderComponent] /
      // [headerComponent] bound on the same element overrides the header set here.
      afterNextRender(() => {
        if (this.getHeaderComponent() !== DcWeekNumberHeader) {
          console.warn(
            'DcWeekNumbers: The calendar header is overridden by [calendarHeaderComponent] / [headerComponent]: dcWeekNumbers has no effect. ' +
              'To show week numbers in a custom header, embed <dc-week-numbers-ruler /> in it and remove dcWeekNumbers.',
          );
        }
      });
    }
  }

  private setHeaderComponent(headerComponent: typeof DcWeekNumberHeader): void {
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
