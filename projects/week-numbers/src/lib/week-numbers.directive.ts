import { computed, Directive, inject, input, isDevMode, OnInit, Type } from '@angular/core';
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
export class DcWeekNumbers implements DcWeekNumbersHost, OnInit {
  /** Alternative header displayed above the calendar. Empty → standard Material header. */
  readonly dcWeekNumbers = input<Type<unknown> | '' | null | undefined>();

  readonly innerHeader = computed(() => this.dcWeekNumbers() || null);

  private readonly picker =
    inject(MatDatepicker, { self: true, optional: true }) ??
    inject(MatDateRangePicker, { self: true, optional: true });
  private readonly calendar = inject(MatCalendar, { self: true, optional: true });

  constructor() {
    this.setHeader(DcWeekNumberHeader);
  }

  ngOnInit(): void {
    // Template inputs are applied after the constructor: a [calendarHeaderComponent] /
    // [headerComponent] bound on top of the directive would have overridden our header.
    if (isDevMode() && this.getHeader() !== DcWeekNumberHeader) {
      console.warn(
        '[dcWeekNumbers] The calendar header has been overridden, week numbers will not be ' +
          'displayed. Pass the header to the directive instead: [dcWeekNumbers]="MyHeader".',
      );
    }
  }

  private setHeader(header: Type<unknown>): void {
    if (this.picker) this.picker.calendarHeaderComponent = header;
    else if (this.calendar) this.calendar.headerComponent = header;
  }

  private getHeader(): unknown {
    return this.picker ? this.picker.calendarHeaderComponent : this.calendar?.headerComponent;
  }
}
