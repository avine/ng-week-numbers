import { Component, viewChild } from '@angular/core';
import {
  MatDatepickerModule,
  type MatDatepicker,
  type MatDateRangePicker,
} from '@angular/material/datepicker';
import {
  CustomHeader,
  flush,
  NOVEMBER_2026,
  setupCalendar,
  weekNumbers,
} from './testing/week-numbers-testing';
import { DcWeekNumbers } from './week-numbers';

@Component({
  imports: [MatDatepickerModule, DcWeekNumbers],
  template: `
    <mat-calendar class="inline" dcWeekNumbers [startAt]="startAt" />
    <input [matDatepicker]="picker" />
    <mat-datepicker #picker dcWeekNumbers [startAt]="startAt" />
    <mat-date-range-input [rangePicker]="range"
      ><input matStartDate /><input matEndDate
    /></mat-date-range-input>
    <mat-date-range-picker #range dcWeekNumbers [startAt]="startAt" />
  `,
})
class DirectiveHost {
  readonly startAt = new Date(2026, 10, 5);
  readonly picker = viewChild.required<MatDatepicker<Date>>('picker');
  readonly range = viewChild.required<MatDateRangePicker<Date>>('range');
}

@Component({
  imports: [MatDatepickerModule, DcWeekNumbers],
  template: `
    <mat-calendar class="inline" dcWeekNumbers [headerComponent]="header" [startAt]="startAt" />
  `,
})
class DirectiveConflictHost {
  readonly header = CustomHeader;
  readonly startAt = new Date(2026, 10, 5);
}

describe('DcWeekNumbers', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.remove());
  });

  const overlay = () => document.querySelector<HTMLElement>('.mat-datepicker-content')!;

  it('mat-calendar: applies DcWeekNumbersHeader', async () => {
    const { fixture, root } = setupCalendar(DirectiveHost);
    await flush(fixture);
    const inline = root.querySelector<HTMLElement>('mat-calendar.inline')!;
    expect(inline.querySelector('dc-week-numbers-header mat-calendar-header')).not.toBeNull();
    expect(weekNumbers(inline)).toEqual(NOVEMBER_2026);
    expect(warn).not.toHaveBeenCalled();
  });

  it('mat-datepicker: applies DcWeekNumbersHeader in the popup', async () => {
    const { fixture } = setupCalendar(DirectiveHost);
    await flush(fixture);
    fixture.componentInstance.picker().open();
    await flush(fixture);
    expect(overlay().querySelector('dc-week-numbers-header')).not.toBeNull();
    expect(weekNumbers(overlay())).toEqual(NOVEMBER_2026);
  });

  it('mat-date-range-picker: applies DcWeekNumbersHeader in the popup', async () => {
    const { fixture } = setupCalendar(DirectiveHost);
    await flush(fixture);
    fixture.componentInstance.range().open();
    await flush(fixture);
    expect(overlay().querySelector('dc-week-numbers-header')).not.toBeNull();
    expect(weekNumbers(overlay())).toEqual(NOVEMBER_2026);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns in dev mode when [headerComponent] overrides the directive', async () => {
    const { fixture, root } = setupCalendar(DirectiveConflictHost);
    await flush(fixture);
    const inline = root.querySelector<HTMLElement>('mat-calendar.inline')!;
    // The binding wins: the custom header (which embeds the ruler) is rendered.
    expect(inline.querySelector('.custom-header')).not.toBeNull();
    expect(inline.querySelector('dc-week-numbers-header')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<dc-week-numbers-ruler />'));
  });
});
