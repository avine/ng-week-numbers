import { Component, inject, LOCALE_ID } from '@angular/core';
import { MatCalendar } from '@angular/material/datepicker';
import {
  CalendarHost,
  flush,
  NOVEMBER_2026,
  setupCalendar,
  tooltips,
  weekNumbers,
} from './testing/week-numbers-testing';
import { DC_WEEK_NUMBER_FN, provideDcWeekNumberFn } from './week-numbers-config';
import { DcWeekNumbersHeader } from './week-numbers-header';
import type { DcWeekNumberFn } from './week-numbers-strategies';

/** Overrides the numbering for its own calendar only. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'test-overriding-calendar',
  imports: [MatCalendar],
  providers: [provideDcWeekNumberFn(() => 7)],
  template: `<mat-calendar [headerComponent]="header" [startAt]="startAt" />`,
})
class OverridingCalendar {
  readonly header = DcWeekNumbersHeader;
  readonly startAt = new Date(2026, 10, 5);
}

@Component({
  imports: [MatCalendar, OverridingCalendar],
  template: `
    <mat-calendar class="app-calendar" [headerComponent]="header" [startAt]="startAt" />
    <test-overriding-calendar />
  `,
})
class TwoCalendars {
  readonly header = DcWeekNumbersHeader;
  readonly startAt = new Date(2026, 10, 5);
}

describe('DC_WEEK_NUMBER_FN / provideDcWeekNumberFn', () => {
  afterEach(() => vi.restoreAllMocks());

  it('defaults to ISO 8601', async () => {
    const { fixture, root } = setupCalendar(CalendarHost);
    await flush(fixture);
    expect(weekNumbers(root)).toEqual(NOVEMBER_2026);
  });

  it('accepts a custom strategy, which also groups the days into weeks', async () => {
    // "Decades" of the month: 1–10, 11–20, 21–30.
    const { fixture, root } = setupCalendar(CalendarHost, {
      providers: [provideDcWeekNumberFn((date) => Math.ceil(date.getDate() / 10))],
    });
    await flush(fixture);
    expect(weekNumbers(root)).toEqual(['1', '2', '3']);
    expect(tooltips(fixture)).toEqual(['1 – 10', '11 – 20', '21 – 30']);
  });

  it('a constant strategy gives a single week for the whole month', async () => {
    const { fixture, root } = setupCalendar(CalendarHost, {
      providers: [provideDcWeekNumberFn(() => 0)],
    });
    await flush(fixture);
    expect(weekNumbers(root)).toEqual(['0']);
    expect(tooltips(fixture)).toEqual(['1 – 30']);
  });

  it('accepts a strategy provided by a component', async () => {
    const { fixture, root } = setupCalendar(TwoCalendars);
    await flush(fixture);
    expect(weekNumbers(root.querySelector('.app-calendar')!)).toEqual(NOVEMBER_2026);
    expect(weekNumbers(root.querySelector('test-overriding-calendar')!)).toEqual(['7']);
  });

  it.each([
    ['en-US', '1'],
    ['fr', '2'],
  ])('accepts a DC_WEEK_NUMBER_FN factory (Angular i18n build %s)', async (localeId, expected) => {
    const { fixture, root } = setupCalendar(CalendarHost, {
      providers: [
        { provide: LOCALE_ID, useValue: localeId },
        {
          provide: DC_WEEK_NUMBER_FN,
          useFactory: (): DcWeekNumberFn => (inject(LOCALE_ID) === 'en-US' ? () => 1 : () => 2),
        },
      ],
    });
    await flush(fixture);
    expect(weekNumbers(root)).toEqual([expected]);
  });
});
