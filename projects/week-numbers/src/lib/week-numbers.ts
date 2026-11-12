import { afterNextRender, Directive, inject, isDevMode } from '@angular/core';
import { MatCalendar, MatDatepicker, MatDateRangePicker } from '@angular/material/datepicker';
import { DcWeekNumbersHeader } from './week-numbers-header';

/**
 * Shows the week numbers in a datepicker, a date range picker or an inline calendar, without
 * exposing `DcWeekNumbersHeader` to the template:
 *
 * ```html
 * <mat-datepicker dcWeekNumbers />
 * <mat-date-range-picker dcWeekNumbers />
 * <mat-calendar dcWeekNumbers />
 * ```
 *
 * Entry point of the library. The week numbers themselves are rendered by `DcWeekNumbersRuler`.
 *
 * Sets `DcWeekNumbersHeader` as the calendar header (`calendarHeaderComponent` /
 * `headerComponent`, public Material inputs). A custom header does not need this directive:
 * embed `<dc-week-numbers-ruler />` in the custom header component, and bind that component to
 * `[calendarHeaderComponent]` as usual. The custom header replaces the whole Material header: to
 * keep the standard navigation, include `<mat-calendar-header />` in it as well.
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
    this.setHeaderComponent();

    if (isDevMode()) {
      // Template inputs are applied after the constructor: a [calendarHeaderComponent] /
      // [headerComponent] bound on the same element overrides the header set here.
      afterNextRender(() => {
        if (this.getHeaderComponent() !== DcWeekNumbersHeader) {
          console.warn(
            'DcWeekNumbers: The calendar header is overridden by [calendarHeaderComponent] / [headerComponent]: dcWeekNumbers has no effect. ' +
              'To show week numbers in a custom header, embed <dc-week-numbers-ruler /> in it and remove dcWeekNumbers.',
          );
        }
      });
    }
  }

  private setHeaderComponent(): void {
    if (this.picker) {
      this.picker.calendarHeaderComponent = DcWeekNumbersHeader;
    } else if (this.calendar) {
      this.calendar.headerComponent = DcWeekNumbersHeader;
    }
  }

  private getHeaderComponent() {
    return this.picker ? this.picker.calendarHeaderComponent : this.calendar?.headerComponent;
  }
}
