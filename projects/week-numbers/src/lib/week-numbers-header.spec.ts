import { Component, viewChild } from '@angular/core';
import {
  MatDatepickerModule,
  type MatDatepicker,
  type MatDateRangePicker,
} from '@angular/material/datepicker';
import {
  CalendarHost,
  flush,
  NOVEMBER_2026,
  setupCalendar,
  weekNumbers,
} from './testing/week-numbers-testing';
import { DcWeekNumbersHeader } from './week-numbers-header';

@Component({
  imports: [MatDatepickerModule],
  template: `
    <input [matDatepicker]="picker" />
    <mat-datepicker #picker [calendarHeaderComponent]="header" [startAt]="startAt" />
    <mat-date-range-input [rangePicker]="range"
      ><input matStartDate /><input matEndDate
    /></mat-date-range-input>
    <mat-date-range-picker #range [calendarHeaderComponent]="header" [startAt]="startAt" />
  `,
})
class PickersHost {
  readonly header = DcWeekNumbersHeader;
  readonly startAt = new Date(2026, 10, 5);
  readonly picker = viewChild.required<MatDatepicker<Date>>('picker');
  readonly range = viewChild.required<MatDateRangePicker<Date>>('range');
}

describe('DcWeekNumbersHeader', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.remove());
  });

  const overlay = () => document.querySelector<HTMLElement>('.mat-datepicker-content')!;

  it('renders the standard Material header, then the week ruler', async () => {
    const { fixture, root } = setupCalendar(CalendarHost);
    await flush(fixture);
    const header = root.querySelector('dc-week-numbers-header')!;
    expect(header.firstElementChild!.tagName).toBe('MAT-CALENDAR-HEADER');
    expect(header.lastElementChild!.tagName).toBe('DC-WEEK-NUMBERS-RULER');
    expect(weekNumbers(root)).toEqual(NOVEMBER_2026);
  });

  it('mat-datepicker: header and week numbers in the overlay', async () => {
    const { fixture } = setupCalendar(PickersHost);
    await flush(fixture);
    fixture.componentInstance.picker().open();
    await flush(fixture);
    expect(overlay().querySelector('dc-week-numbers-header mat-calendar-header')).not.toBeNull();
    expect(weekNumbers(overlay())).toEqual(NOVEMBER_2026);
    // Material lets the popup grow with a custom header (no fixed 354px height).
    expect(
      overlay().querySelector('.mat-datepicker-content-container-with-custom-header'),
    ).not.toBeNull();
  });

  it('mat-date-range-picker: same', async () => {
    const { fixture } = setupCalendar(PickersHost);
    await flush(fixture);
    fixture.componentInstance.range().open();
    await flush(fixture);
    expect(overlay().querySelector('dc-week-numbers-header mat-calendar-header')).not.toBeNull();
    expect(weekNumbers(overlay())).toEqual(NOVEMBER_2026);
  });
});
