import { InjectionToken, Signal, Type } from '@angular/core';

/**
 * Contract between the `dcWeekNumbers` directive and `DcWeekNumberHeader`.
 * Separate token to avoid a circular import between the directive and the header.
 *
 * Material instantiates the header inside the calendar, but its injector goes up to the
 * directive's host element: `<mat-calendar>` when inline, `<mat-datepicker>` /
 * `<mat-date-range-picker>` in a popup (the overlay is created with the picker's ViewContainerRef).
 */
export interface DcWeekNumbersHost {
  /** Header rendered inside `DcWeekNumberHeader`; `null` → standard Material header. */
  readonly innerHeader: Signal<Type<unknown> | null>;
}

export const DC_WEEK_NUMBERS_HOST = new InjectionToken<DcWeekNumbersHost>('DC_WEEK_NUMBERS_HOST');
