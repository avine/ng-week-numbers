import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { DateRange, MatCalendar } from '@angular/material/datepicker';
import { enUS } from 'date-fns/locale';
import {
  CalendarHost,
  chips,
  CustomHeader,
  flush,
  FR_LABELS,
  NOVEMBER_2026,
  RangeHost,
  sameDay,
  selectedWeeks,
  setupCalendar,
  todayWeeks,
  tooltips,
  weekNumbers,
} from './testing/week-numbers-testing';
import { provideDcWeekNumberFn } from './week-numbers-config';
import { provideDcWeekNumbersIntl } from './week-numbers-intl';
import { dcLocaleWeekNumber } from './week-numbers-strategies';

const clickDay = (root: ParentNode, day: number) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('button.mat-calendar-body-cell'))
    .find((cell) => cell.textContent!.trim() === String(day))!
    .click();

/** Material keyboard handling reads the deprecated `keyCode`. */
function pressKey(target: Element, keyCode: number): void {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'keyCode', { get: () => keyCode });
  target.dispatchEvent(event);
}

const DOWN_ARROW = 40;

/** `@angular/aria` reads `KeyboardEvent#key` (Material reads `keyCode`: see `pressKey`). */
const pressKeyName = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

/** Soft-disabled by the toolbar: `aria-disabled`, still focusable (no native `disabled`). */
const isDisabled = (chip: HTMLButtonElement) => chip.getAttribute('aria-disabled') === 'true';

const nextMonth = (root: ParentNode) =>
  root.querySelector<HTMLButtonElement>('.mat-calendar-next-button')!.click();
const previousMonth = (root: ParentNode) =>
  root.querySelector<HTMLButtonElement>('.mat-calendar-previous-button')!.click();

afterEach(() => vi.restoreAllMocks());

// ---------------------------------------------------------------------------
// Monday-first rows (fr) + ISO: each week is a grid row
// ---------------------------------------------------------------------------

describe('DcWeekNumbersRuler', () => {
  const setup = () => setupCalendar(CalendarHost);

  it('one button per week, in chronological order (fr: one per grid row)', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    expect(weekNumbers(root)).toEqual(NOVEMBER_2026);
    expect(root.querySelectorAll('tbody [data-mat-row][data-mat-col="0"]')).toHaveLength(6);
  });

  it('leaves the calendar grid untouched', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    expect(root.querySelectorAll('.mat-calendar-table thead tr:first-child th')).toHaveLength(7);
    expect(
      root.querySelector<HTMLTableCellElement>('.mat-calendar-table-header-divider')!.colSpan,
    ).toBe(7);
    expect(root.querySelector('.mat-calendar-table .dc-week-numbers-ruler__chip')).toBeNull();
  });

  it('fills nothing without selection and marks the current week', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual([]);
    expect(todayWeeks(root)).toEqual(['46']);
  });

  it.each([
    [1, '44'], // Sunday, single day of the week in the month
    [8, '45'], // Sunday, last day of the week
    [9, '46'], // Monday, first day of the week
    [30, '49'], // Monday, single day of the week in the month
  ])('selected date November %i → week %s', async (day, expected) => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 10, day);
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual([expected]);
  });

  it('ignores a selected day of the week that belongs to another month (not displayed)', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 9, 31); // Saturday, week of Nov 1st
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual([]);
  });

  it('both states can be combined', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 10, 12);
    await flush(fixture);
    const week46 = chips(root)[2];
    expect(week46.classList).toContain('dc-week-numbers-ruler__chip--selected');
    expect(week46.classList).toContain('dc-week-numbers-ruler__chip--today');
    // Both announced to screen readers, with two distinct attributes.
    expect(week46.getAttribute('aria-current')).toBe('date');
    expect(week46.getAttribute('aria-pressed')).toBe('true');
  });

  it('exposes the days of each week as tooltip and accessible label', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 10, 5);
    await flush(fixture);
    expect(tooltips(fixture)).toEqual(['1', '2 – 8', '9 – 15', '16 – 22', '23 – 29', '30']);
    expect(chips(root)[0].getAttribute('aria-label')).toBe('Semaine 44, 1');
    expect(chips(root)[2].getAttribute('aria-label')).toBe('Semaine 46, 9 – 15');
    // Like the day cells of the grid: today → aria-current="date", selection → aria-pressed.
    expect(chips(root).map((chip) => chip.getAttribute('aria-current'))).toEqual([
      null,
      null,
      'date',
      null,
      null,
      null,
    ]);
    expect(chips(root).map((chip) => chip.getAttribute('aria-pressed'))).toEqual([
      'false',
      'true',
      'false',
      'false',
      'false',
      'false',
    ]);
    const group = root.querySelector('.dc-week-numbers-ruler__group')!;
    expect(group.getAttribute('role')).toBe('toolbar');
    expect(group.getAttribute('aria-label')).toBe('Numéros de semaine');
    expect(
      group.querySelector('.dc-week-numbers-ruler__caption')!.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('click: moves the active date and the focus to the first day of the week in the month', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    const calendar = fixture.componentInstance.calendar();

    chips(root)[0].click(); // week 44: Monday Oct 26 → Sunday Nov 1
    await flush(fixture);
    expect(sameDay(calendar.activeDate, new Date(2026, 10, 1))).toBe(true);

    chips(root)[2].click(); // week 46: Monday Nov 9
    await flush(fixture);
    expect(sameDay(calendar.activeDate, new Date(2026, 10, 9))).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('.mat-calendar-body-active'));
    expect(document.activeElement!.textContent!.trim()).toBe('9');

    // Does not select the date: nothing is filled.
    expect(fixture.componentInstance.selected).toBeNull();
    expect(selectedWeeks(root)).toEqual([]);
  });

  it('click: the focused day shows the focus indicator, even right after the mousedown', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    // Fast click (trackpad tap): mousedown, mouseup and click are dispatched at once.
    // The CDK FocusMonitor forgets the mouse origin with a 1ms timer, Material focuses the day
    // with a 0ms timer. Node clamps 0ms to 1ms (the CDK timer always wins), browsers do not:
    // stretch the 1ms timers to reproduce the browser race. Timers with the same delay keep
    // their order (HTML spec), as in a browser.
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: () => void, ms?: number) =>
      realSetTimeout(handler, ms === 1 ? 20 : ms)) as typeof setTimeout);
    const chip = chips(root)[2];
    // `buttons` / `detail`: otherwise the CDK takes it for a screen reader (keyboard origin).
    const pointer = { bubbles: true, buttons: 1, detail: 1 };
    chip.dispatchEvent(new MouseEvent('mousedown', pointer));
    chip.dispatchEvent(new MouseEvent('mouseup', pointer));
    chip.click();
    await flush(fixture);
    await new Promise((r) => realSetTimeout(r, 50));
    await flush(fixture);
    expect(document.activeElement!.textContent!.trim()).toBe('9');
    // Material only draws the grey focus indicator for keyboard / program focus.
    expect(root.querySelector('.mat-calendar-content')!.classList).toContain('cdk-program-focused');
  });

  it('follows the selection, not the keyboard navigation', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    pressKey(root.querySelector('.mat-calendar-body-active')!, DOWN_ARROW); // Nov 5 → Nov 12
    await flush(fixture);
    expect(sameDay(fixture.componentInstance.calendar().activeDate, new Date(2026, 10, 12))).toBe(
      true,
    );
    expect(selectedWeeks(root)).toEqual([]);

    clickDay(root, 19);
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(['47']);
    clickDay(root, 3);
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(['45']);
  });

  it('fills nothing once the month changes, again when coming back', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 10, 12);
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(['46']);

    nextMonth(root);
    await flush(fixture);
    expect(weekNumbers(root)).toEqual(['49', '50', '51', '52', '53']);
    expect(selectedWeeks(root)).toEqual([]);

    previousMonth(root);
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(['46']);
  });

  it('follows the month navigation, across the 53-week year 2026', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    nextMonth(root);
    await flush(fixture);
    // December 2026: Tuesday 1st → Thursday 31st
    expect(weekNumbers(root)).toEqual(['49', '50', '51', '52', '53']);
    expect(tooltips(fixture)[0]).toBe('1 – 6');

    nextMonth(root);
    await flush(fixture);
    // January 2027: Friday 1st → Sunday 31st, the first week is still week 53 of 2026
    expect(weekNumbers(root)).toEqual(['53', '1', '2', '3', '4']);
    expect(tooltips(fixture)).toEqual(['1 – 3', '4 – 10', '11 – 17', '18 – 24', '25 – 31']);
    expect(todayWeeks(root)).toEqual([]);

    chips(root)[0].click(); // week 53: Monday Dec 28 → Sunday Jan 3
    await flush(fixture);
    expect(sameDay(fixture.componentInstance.calendar().activeDate, new Date(2027, 0, 1))).toBe(
      true,
    );
  });

  it('is hidden in the year and multi-year views', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    const calendar = fixture.componentInstance.calendar();

    root.querySelector<HTMLButtonElement>('.mat-calendar-period-button')!.click();
    await flush(fixture);
    expect(calendar.currentView).toBe('multi-year');
    expect(root.querySelector('.dc-week-numbers-ruler__group')).toBeNull();

    calendar.currentView = 'year';
    await flush(fixture);
    expect(root.querySelector('.dc-week-numbers-ruler__group')).toBeNull();

    calendar.currentView = 'month';
    await flush(fixture);
    expect(weekNumbers(root)).toEqual(NOVEMBER_2026);
  });

  it('disables the weeks that are entirely out of minDate / maxDate', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.minDate.set(new Date(2026, 10, 10));
    fixture.componentInstance.maxDate.set(new Date(2026, 10, 20));
    await flush(fixture);
    expect(chips(root).map(isDisabled)).toEqual([
      true,
      true,
      false,
      false,
      true,
      true,
    ]);

    chips(root)[2].click(); // week 46 starts on the 9th, before minDate: clamped
    await flush(fixture);
    expect(sameDay(fixture.componentInstance.calendar().activeDate, new Date(2026, 10, 10))).toBe(
      true,
    );
  });

  it('disables the weeks whose days are all rejected by dateFilter, and follows its changes', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    expect(chips(root).some(isDisabled)).toBe(false);

    // Weekdays only: week 44 (Sunday Nov 1 only) has no enabled day.
    fixture.componentInstance.dateFilter.set((date) => date.getDay() !== 0 && date.getDay() !== 6);
    await flush(fixture);
    expect(chips(root).map(isDisabled)).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  it('click: moves to the first day of the week accepted by dateFilter', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.dateFilter.set((date) => date.getDay() !== 1); // no Mondays
    await flush(fixture);
    chips(root)[2].click(); // week 46: Monday Nov 9 is rejected
    // Focus: the ruler's 1ms timer, then Material's afterNextRender + setTimeout.
    await flush(fixture);
    await flush(fixture);
    expect(sameDay(fixture.componentInstance.calendar().activeDate, new Date(2026, 10, 10))).toBe(
      true,
    );
    expect(document.activeElement!.textContent!.trim()).toBe('10');
  });

  it('combines minDate and dateFilter', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.minDate.set(new Date(2026, 10, 10)); // Tuesday
    fixture.componentInstance.dateFilter.set((date) => date.getDay() !== 2); // no Tuesdays
    await flush(fixture);
    chips(root)[2].click(); // week 46: Nov 9 < minDate, Nov 10 rejected -> Nov 11
    await flush(fixture);
    expect(sameDay(fixture.componentInstance.calendar().activeDate, new Date(2026, 10, 11))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// Keyboard: one tab stop (`@angular/aria` toolbar)
// ---------------------------------------------------------------------------

describe('DcWeekNumbersRuler — keyboard', () => {
  const setup = () => setupCalendar(CalendarHost);
  const tabStops = (root: ParentNode) =>
    chips(root).flatMap((chip, i) => (chip.getAttribute('tabindex') === '0' ? [i] : []));

  it('one tab stop for the whole ruler: the first week', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 10, 12);
    await flush(fixture);
    expect(tabStops(root)).toEqual([0]);
    expect(chips(root).slice(1).every((chip) => chip.getAttribute('tabindex') === '-1')).toBe(
      true,
    );
  });

  it('arrow keys, Home and End move the focus and the tab stop', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    chips(root)[0].focus();

    pressKeyName(chips(root)[0], 'ArrowRight');
    await flush(fixture);
    expect(document.activeElement).toBe(chips(root)[1]);
    expect(tabStops(root)).toEqual([1]);

    pressKeyName(chips(root)[1], 'End');
    await flush(fixture);
    expect(document.activeElement).toBe(chips(root)[5]);

    pressKeyName(chips(root)[5], 'ArrowLeft');
    await flush(fixture);
    expect(document.activeElement).toBe(chips(root)[4]);

    pressKeyName(chips(root)[4], 'Home');
    await flush(fixture);
    expect(document.activeElement).toBe(chips(root)[0]);
    expect(tabStops(root)).toEqual([0]);
  });

  it('wraps at the ends', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    chips(root)[0].focus();

    pressKeyName(chips(root)[0], 'ArrowLeft');
    await flush(fixture);
    expect(document.activeElement).toBe(chips(root)[5]);

    pressKeyName(chips(root)[5], 'ArrowRight');
    await flush(fixture);
    expect(document.activeElement).toBe(chips(root)[0]);
  });

  it('disabled weeks stay focusable, but clicking them does nothing', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.minDate.set(new Date(2026, 10, 10));
    await flush(fixture);
    const calendar = fixture.componentInstance.calendar();
    const activeDate = calendar.activeDate;
    expect(isDisabled(chips(root)[0])).toBe(true);

    chips(root)[0].focus(); // the tab stop: week 44, disabled
    pressKeyName(chips(root)[0], 'ArrowRight'); // week 45, disabled too
    await flush(fixture);
    expect(document.activeElement).toBe(chips(root)[1]);

    chips(root)[1].click();
    await flush(fixture);
    await flush(fixture);
    expect(sameDay(calendar.activeDate, activeDate)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Date range
// ---------------------------------------------------------------------------

describe('DcWeekNumbersRuler — date range', () => {
  it.each([
    ['Nov 10 → Nov 20', new Date(2026, 10, 10), new Date(2026, 10, 20), ['46', '47']],
    [
      'Oct 28 → Nov 3 (starts in October)',
      new Date(2026, 9, 28),
      new Date(2026, 10, 3),
      ['44', '45'],
    ],
    [
      'Nov 25 → Dec 10 (ends in December)',
      new Date(2026, 10, 25),
      new Date(2026, 11, 10),
      ['48', '49'],
    ],
    ['Nov 16, end not chosen yet', new Date(2026, 10, 16), null, ['47']],
    ['Oct 1 → Oct 31 (another month)', new Date(2026, 9, 1), new Date(2026, 9, 31), []],
  ])('fills every week of the range in the month: %s', async (_, start, end, expected) => {
    const { fixture, root } = setupCalendar(RangeHost);
    fixture.componentInstance.range.set(new DateRange<Date>(start, end));
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(expected);
  });

  it('follows a range spanning several months', async () => {
    const { fixture, root } = setupCalendar(RangeHost);
    fixture.componentInstance.range.set(
      new DateRange<Date>(new Date(2026, 10, 25), new Date(2027, 0, 6)),
    );
    await flush(fixture);
    nextMonth(root); // December
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(['49', '50', '51', '52', '53']);
  });
});

// ---------------------------------------------------------------------------
// Sunday-first rows (enUS) + ISO: a week spans two rows
// ---------------------------------------------------------------------------

describe('DcWeekNumbersRuler — enUS + ISO (default)', () => {
  const setup = () => setupCalendar(RangeHost, { locale: enUS });

  it('one button per ISO week (Monday → Sunday), not per row', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    expect(root.querySelector('thead th')!.textContent).toContain('Sunday');
    // 5 rows (Sunday 1st → Monday 30th), but 6 ISO weeks.
    expect(root.querySelectorAll('tbody [data-mat-row][data-mat-col="0"]')).toHaveLength(5);
    expect(weekNumbers(root)).toEqual(NOVEMBER_2026);
    expect(tooltips(fixture)).toEqual(['1', '2 – 8', '9 – 15', '16 – 22', '23 – 29', '30']);
    expect(todayWeeks(root)).toEqual(['46']);
  });

  it.each([
    ['Mon Nov 9 → Sun Nov 15', new Date(2026, 10, 9), new Date(2026, 10, 15), ['46']],
    ['Sun Nov 15 only', new Date(2026, 10, 15), new Date(2026, 10, 15), ['46']],
    ['Sun Nov 1 only', new Date(2026, 10, 1), new Date(2026, 10, 1), ['44']],
    ['Sun Nov 15 → Mon Nov 16', new Date(2026, 10, 15), new Date(2026, 10, 16), ['46', '47']],
  ])('fills the ISO weeks of the range: %s', async (_, start, end, expected) => {
    const { fixture, root } = setup();
    fixture.componentInstance.range.set(new DateRange<Date>(start, end));
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(expected);
  });

  it('click: moves the active date to the Monday of the week', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    chips(root)[3].click(); // week 47
    await flush(fixture);
    expect(sameDay(fixture.componentInstance.calendar().activeDate, new Date(2026, 10, 16))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// Custom header
// ---------------------------------------------------------------------------

@Component({
  imports: [MatCalendar],
  template: `<mat-calendar [headerComponent]="header" [startAt]="startAt" />`,
})
class CustomHeaderHost {
  readonly header = CustomHeader;
  readonly startAt = new Date(2026, 10, 5);
}

describe('DcWeekNumbersRuler — custom header', () => {
  it('can be embedded in any calendar header', async () => {
    const { fixture, root } = setupCalendar(CustomHeaderHost);
    await flush(fixture);
    expect(root.querySelector('.custom-header')!.textContent).toBe('custom 11');
    expect(root.querySelector('mat-calendar-header')).toBeNull();
    expect(weekNumbers(root)).toEqual(NOVEMBER_2026);
  });
});

// ---------------------------------------------------------------------------
// Date adapter
// ---------------------------------------------------------------------------

describe('DcWeekNumbersRuler — date adapter', () => {
  it('reports an error in dev mode and shows no week numbers with another adapter', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideNativeDateAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
        provideDcWeekNumbersIntl(signal(FR_LABELS)),
      ],
    });
    const fixture = TestBed.createComponent(CalendarHost);
    const root = fixture.nativeElement as HTMLElement;
    await flush(fixture);
    expect(root.querySelector('mat-calendar-header')).not.toBeNull();
    expect(root.querySelector('.dc-week-numbers-ruler__group')).toBeNull();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('DateFnsAdapter'));
  });

  it('follows DateAdapter#setLocale() at runtime', async () => {
    const { fixture, root } = setupCalendar(CalendarHost, {
      providers: [provideDcWeekNumberFn(dcLocaleWeekNumber)],
    });
    fixture.componentInstance.startAt = new Date(2026, 11, 15); // December 2026
    await flush(fixture);
    // fr: Monday-first weeks, last week Mon Dec 28 → week 53
    expect(weekNumbers(root)).toEqual(['49', '50', '51', '52', '53']);

    TestBed.inject(DateAdapter).setLocale(enUS);
    await flush(fixture);
    // enUS: Sunday-first weeks, last week (Sun Dec 27 → Sat Jan 2) → US week 1 of 2027
    expect(root.querySelector('thead th')!.textContent).toContain('Sunday');
    expect(weekNumbers(root)).toEqual(['49', '50', '51', '52', '1']);
    expect(tooltips(fixture)).toEqual(['1 – 5', '6 – 12', '13 – 19', '20 – 26', '27 – 31']);
  });
});
