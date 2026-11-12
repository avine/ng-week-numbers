import { Component } from '@angular/core';
import { MatCalendarHeader } from '@angular/material/datepicker';
import { DcWeekNumbersRuler } from './week-numbers-ruler';

/**
 * Calendar header with week numbers: the standard Material header (period button, previous /
 * next buttons, labels from `MatDatepickerIntl`), then the week ruler (`DcWeekNumbersRuler`).
 *
 * Usually applied through the `dcWeekNumbers` directive (`<mat-datepicker dcWeekNumbers />`),
 * or bound explicitly:
 *
 * ```html
 * <mat-datepicker [calendarHeaderComponent]="DcWeekNumberHeader" />
 * <mat-date-range-picker [calendarHeaderComponent]="DcWeekNumberHeader" />
 * <mat-calendar [headerComponent]="DcWeekNumberHeader" />
 * ```
 *
 * To add week numbers to a custom header, embed `<dc-week-numbers-ruler />` in it instead.
 */
@Component({
  selector: 'dc-week-number-header',
  host: { class: 'dc-week-number-header' },
  imports: [MatCalendarHeader, DcWeekNumbersRuler],
  template: `<mat-calendar-header /><dc-week-numbers-ruler />`,
})
export class DcWeekNumberHeader {}
