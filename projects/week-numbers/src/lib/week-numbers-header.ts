import { Component } from '@angular/core';
import { MatCalendarHeader } from '@angular/material/datepicker';
import { DcWeekNumbersRuler } from './week-numbers-ruler';

/**
 * Calendar header with week numbers: the standard Material header (period button, previous /
 * next buttons, labels from `MatDatepickerIntl`), then the week ruler (`DcWeekNumbersRuler`).
 *
 * Usually applied through the `dcWeekNumbers` directive (`<mat-datepicker dcWeekNumbers />`),
 * or bound explicitly through a field of the component (templates cannot reference a class):
 *
 * ```ts
 * readonly weekNumbersHeader = DcWeekNumbersHeader;
 * ```
 *
 * ```html
 * <mat-datepicker [calendarHeaderComponent]="weekNumbersHeader" />
 * <mat-date-range-picker [calendarHeaderComponent]="weekNumbersHeader" />
 * <mat-calendar [headerComponent]="weekNumbersHeader" />
 * ```
 *
 * To add week numbers to a custom header, embed `<dc-week-numbers-ruler />` in it instead.
 */
@Component({
  selector: 'dc-week-numbers-header',
  imports: [MatCalendarHeader, DcWeekNumbersRuler],
  template: `<mat-calendar-header /><dc-week-numbers-ruler />`,
})
export class DcWeekNumbersHeader {}
