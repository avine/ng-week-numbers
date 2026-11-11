import { Component } from '@angular/core';
import { MatCalendarHeader } from '@angular/material/datepicker';
import { DcWeekRuler } from './week-ruler';

/**
 * Calendar header with week numbers: the standard Material header (period button, previous /
 * next buttons, labels from `MatDatepickerIntl`), then the week ruler (`DcWeekRuler`).
 *
 * ```html
 * <mat-datepicker [calendarHeaderComponent]="DcWeekNumberHeader" />
 * <mat-date-range-picker [calendarHeaderComponent]="DcWeekNumberHeader" />
 * <mat-calendar [headerComponent]="DcWeekNumberHeader" />
 * ```
 *
 * To add week numbers to a custom header, embed `<dc-week-ruler />` in it instead.
 */
@Component({
  selector: 'dc-week-number-header',
  imports: [MatCalendarHeader, DcWeekRuler],
  template: `<mat-calendar-header /><dc-week-ruler />`,
  host: { class: 'dc-week-number-header' },
})
export class DcWeekNumberHeader {}
