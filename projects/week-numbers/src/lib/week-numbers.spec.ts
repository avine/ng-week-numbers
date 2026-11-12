import {
  Component,
  inject,
  LOCALE_ID,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type Type,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideDateFnsAdapter, type DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { DateAdapter, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import {
  DateRange,
  MatCalendar,
  MatDatepickerModule,
  type MatDatepicker,
  type MatDateRangePicker,
} from '@angular/material/datepicker';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import type { Locale } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { dcIsoWeekNumber, dcLocaleWeekNumber, type DcWeekNumberFn } from './week-number-fns';
import { DcWeekNumberHeader } from './week-number-header';
import { DC_WEEK_NUMBER_FN, provideDcWeekNumberFn } from './week-numbers-config';
import { DcWeekNumbers } from './week-numbers-directive';
import { DC_WEEK_NUMBERS_INTL, type DcWeekNumbersIntl } from './week-numbers-intl';
import { DcWeekNumbersRuler } from './week-numbers-ruler';

/** The library ships no labels: the application provides them. */
const LABELS: DcWeekNumbersIntl = {
  weekNumbers: 'Numéros de semaine',
  week: 'Sem.',
  formatWeekLabel: (week, days) => `Semaine ${week}, ${days}`,
};
const provideLabels = () => ({ provide: DC_WEEK_NUMBERS_INTL, useFactory: () => signal(LABELS) });

describe('week number strategies', () => {
  function adapterFor(locale: Locale): DateFnsAdapter {
    TestBed.configureTestingModule({
      providers: [provideDateFnsAdapter(), { provide: MAT_DATE_LOCALE, useValue: locale }],
    });
    return TestBed.inject(DateAdapter) as DateFnsAdapter;
  }

  it.each([
    ['2026-01-01', 1], // Thursday → week 1
    ['2026-12-28', 53], // 2026 has 53 weeks
    ['2027-01-01', 53], // Friday → still week 53 of 2026
    ['2027-01-04', 1],
    ['2024-12-30', 1], // Monday → week 1 of 2025
    ['2021-01-03', 53], // Sunday → week 53 of 2020
  ])('dcIsoWeekNumber, fr: %s → %i', (iso, expected) => {
    const adapter = adapterFor(fr);
    const [y, m, d] = iso.split('-').map(Number);
    expect(dcIsoWeekNumber(new Date(y, m - 1, d), adapter)).toBe(expected);
  });

  it('enUS (Sunday-first weeks): ISO by default, US numbering with dcLocaleWeekNumber', () => {
    const adapter = adapterFor(enUS);
    const sunday = new Date(2026, 11, 27); // Sunday Dec 27 2026
    const monday = new Date(2026, 11, 28);
    expect(dcIsoWeekNumber(sunday, adapter)).toBe(52); // ISO: Sunday ends week 52
    expect(dcIsoWeekNumber(monday, adapter)).toBe(53);
    expect(dcLocaleWeekNumber(sunday, adapter)).toBe(1); // US: week containing Jan 1
    expect(dcLocaleWeekNumber(monday, adapter)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOVEMBER_2026 = ['44', '45', '46', '47', '48', '49'];

const flush = async (fixture: ComponentFixture<unknown>) => {
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r)); // afterNextRender callbacks (focus)
};

const chips = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('.dc-week-numbers-ruler__chip'));

const weekNumbers = (root: ParentNode) => chips(root).map((chip) => chip.textContent!.trim());

/** Tooltip messages of the buttons (`matTooltip` does not set the `title` attribute). */
const tooltips = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement
    .queryAll(By.css('.dc-week-numbers-ruler__chip'))
    .map((chip) => chip.injector.get(MatTooltip).message);

/** Week numbers of the filled buttons. */
const selectedWeeks = (root: ParentNode) =>
  chips(root)
    .filter((chip) => chip.classList.contains('dc-week-numbers-ruler__chip--selected'))
    .map((chip) => chip.textContent!.trim());

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

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

// ---------------------------------------------------------------------------
// Inline calendar
// ---------------------------------------------------------------------------

@Component({
  imports: [MatCalendar],
  template: `
    <mat-calendar
      [headerComponent]="header"
      [startAt]="startAt"
      [minDate]="minDate()"
      [maxDate]="maxDate()"
      [(selected)]="selected"
    />
  `,
})
class Host {
  readonly header = DcWeekNumberHeader;
  startAt = new Date(2026, 10, 5); // Thursday, November 5th 2026
  readonly minDate = signal<Date | null>(null);
  readonly maxDate = signal<Date | null>(null);
  selected: Date | null = null;
  readonly calendar = viewChild.required<MatCalendar<Date>>(MatCalendar);
}

/** Overrides the numbering for its own calendar only. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'test-overriding-calendar',
  imports: [MatCalendar],
  providers: [provideDcWeekNumberFn(() => 7)],
  template: `<mat-calendar [headerComponent]="header" [startAt]="startAt" />`,
})
class OverridingCalendar {
  readonly header = DcWeekNumberHeader;
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
  readonly header = DcWeekNumberHeader;
  readonly startAt = new Date(2026, 10, 5);
}

describe('DcWeekNumberHeader', () => {
  function setup<T = Host>(
    extraProviders: unknown[] = [],
    component: Type<T> = Host as unknown as Type<T>,
  ) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: fr },
        provideLabels(),
        ...(extraProviders as never[]),
      ],
    });
    // Fixed "today": Wednesday, November 11th 2026 (week 46).
    vi.spyOn(TestBed.inject(DateAdapter), 'today').mockReturnValue(new Date(2026, 10, 11));
    const fixture = TestBed.createComponent(component);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => vi.restoreAllMocks());

  it('renders the standard Material header and one button per week (fr: one per grid row)', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    expect(root.querySelector('dc-week-number-header mat-calendar-header')).not.toBeNull();
    expect(weekNumbers(root)).toEqual(NOVEMBER_2026);
    // Monday-first locale + ISO: each week is a grid row.
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
    const today = chips(root).filter((chip) =>
      chip.classList.contains('dc-week-numbers-ruler__chip--today'),
    );
    expect(today.map((chip) => chip.textContent!.trim())).toEqual(['46']);
  });

  it.each([
    [1, '44'], // Sunday, single-day row
    [8, '45'], // Sunday, last day of the week
    [9, '46'], // Monday, first day of the week
    [30, '49'], // Monday, single-day row
  ])('selected date November %i → week %s', async (day, expected) => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 10, day);
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual([expected]);
  });

  it('ignores a selected day of the week that belongs to another month (not displayed)', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 9, 31); // Saturday, in the row of Nov 1st
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
  });

  it('exposes the days of each week as tooltip and accessible label', async () => {
    const { fixture, root } = setup();
    fixture.componentInstance.selected = new Date(2026, 10, 5);
    await flush(fixture);
    expect(tooltips(fixture)).toEqual(['1', '2 – 8', '9 – 15', '16 – 22', '23 – 29', '30']);
    expect(chips(root)[2].getAttribute('aria-label')).toBe('Semaine 46, 9 – 15');
    expect(chips(root)[0].getAttribute('aria-label')).toBe('Semaine 44, 1');
    expect(chips(root).map((chip) => chip.getAttribute('aria-current'))).toEqual([
      null,
      'true',
      null,
      null,
      null,
      null,
    ]);
    const group = root.querySelector('.dc-week-numbers-ruler__group')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Numéros de semaine');
    expect(group.querySelector('.dc-week-numbers-ruler__caption')!.textContent).toBe('Sem.');
  });

  it('click: moves the active date and the focus to the first day of the week in the month', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    const calendar = fixture.componentInstance.calendar();

    chips(root)[0].click(); // week 44: starts on Monday Oct 26 → Sunday Nov 1
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

    root.querySelector<HTMLButtonElement>('.mat-calendar-next-button')!.click();
    await flush(fixture);
    expect(weekNumbers(root)).toEqual(['49', '50', '51', '52', '53']);
    expect(selectedWeeks(root)).toEqual([]);

    root.querySelector<HTMLButtonElement>('.mat-calendar-previous-button')!.click();
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(['46']);
  });

  it('follows the month navigation, across the 53-week year 2026', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    root.querySelector<HTMLButtonElement>('.mat-calendar-next-button')!.click();
    await flush(fixture);
    // December 2026: Tuesday 1st → Thursday 31st
    expect(weekNumbers(root)).toEqual(['49', '50', '51', '52', '53']);
    expect(tooltips(fixture)[0]).toBe('1 – 6');

    root.querySelector<HTMLButtonElement>('.mat-calendar-next-button')!.click();
    await flush(fixture);
    // January 2027: Friday 1st → Sunday 31st, the first row is still week 53 of 2026
    expect(weekNumbers(root)).toEqual(['53', '1', '2', '3', '4']);
    expect(tooltips(fixture)).toEqual(['1 – 3', '4 – 10', '11 – 17', '18 – 24', '25 – 31']);
    expect(
      chips(root).some((chip) => chip.classList.contains('dc-week-numbers-ruler__chip--today')),
    ).toBe(false);

    chips(root)[0].click(); // week 53: Monday Dec 28 → Friday Jan 1st
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
    expect(chips(root).map((chip) => chip.disabled)).toEqual([
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

  it('labels can be translated at runtime', async () => {
    const intl = signal(LABELS);
    const { fixture, root } = setup([{ provide: DC_WEEK_NUMBERS_INTL, useValue: intl }]);
    await flush(fixture);
    intl.set({
      weekNumbers: 'Week numbers',
      week: 'Wk',
      formatWeekLabel: (week, days) => `Week ${week} (${days})`,
    });
    await flush(fixture);
    expect(root.querySelector('.dc-week-numbers-ruler__caption')!.textContent).toBe('Wk');
    expect(root.querySelector('.dc-week-numbers-ruler__group')!.getAttribute('aria-label')).toBe(
      'Week numbers',
    );
    expect(chips(root)[1].getAttribute('aria-label')).toBe('Week 45 (2 – 8)');
  });

  it('throws when DC_WEEK_NUMBERS_INTL is not provided', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: fr },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    expect(() => fixture.detectChanges()).toThrow(/DC_WEEK_NUMBERS_INTL/);
  });

  it('accepts a custom numbering strategy', async () => {
    const { fixture, root } = setup([provideDcWeekNumberFn(() => 0)]);
    await flush(fixture);
    expect(new Set(weekNumbers(root))).toEqual(new Set(['0']));
  });

  it('accepts a numbering strategy provided by a component', async () => {
    const { fixture, root } = setup([], TwoCalendars);
    await flush(fixture);
    expect(weekNumbers(root.querySelector('.app-calendar')!)).toEqual(NOVEMBER_2026);
    expect(new Set(weekNumbers(root.querySelector('test-overriding-calendar')!))).toEqual(
      new Set(['7']),
    );
  });

  it.each([
    ['en-US', '1'],
    ['fr', '2'],
  ])('accepts a DC_WEEK_NUMBER_FN factory (Angular i18n build %s)', async (localeId, expected) => {
    const { fixture, root } = setup([
      { provide: LOCALE_ID, useValue: localeId },
      {
        provide: DC_WEEK_NUMBER_FN,
        useFactory: (): DcWeekNumberFn => (inject(LOCALE_ID) === 'en-US' ? () => 1 : () => 2),
      },
    ]);
    await flush(fixture);
    expect(new Set(weekNumbers(root))).toEqual(new Set([expected]));
  });
});

@Component({
  imports: [MatCalendar],
  template: `<mat-calendar [headerComponent]="header" [startAt]="startAt" [selected]="range()" />`,
})
class RangeHost {
  readonly header = DcWeekNumberHeader;
  readonly startAt = new Date(2026, 10, 5);
  readonly range = signal(new DateRange<Date>(new Date(2026, 10, 10), new Date(2026, 10, 20)));
  readonly calendar = viewChild.required<MatCalendar<Date>>(MatCalendar);
}

describe('DcWeekNumberHeader — date range', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: fr },
        provideLabels(),
      ],
    }),
  );

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
    const fixture = TestBed.createComponent(RangeHost);
    fixture.componentInstance.range.set(new DateRange<Date>(start, end));
    await flush(fixture);
    expect(selectedWeeks(fixture.nativeElement)).toEqual(expected);
  });

  it('follows a range spanning several months', async () => {
    const fixture = TestBed.createComponent(RangeHost);
    fixture.componentInstance.range.set(
      new DateRange<Date>(new Date(2026, 10, 25), new Date(2027, 0, 6)),
    );
    await flush(fixture);
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.mat-calendar-next-button')!.click(); // December
    await flush(fixture);
    expect(selectedWeeks(root)).toEqual(['49', '50', '51', '52', '53']);
  });
});

// ---------------------------------------------------------------------------
// ISO weeks with Sunday-first rows (enUS): a week spans two rows
// ---------------------------------------------------------------------------

describe('DcWeekNumberHeader — enUS + ISO (default)', () => {
  function setup(selected: DateRange<Date> | null = null) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: enUS },
        provideLabels(),
      ],
    });
    // Fixed "today": Wednesday, November 11th 2026 (week 46).
    vi.spyOn(TestBed.inject(DateAdapter), 'today').mockReturnValue(new Date(2026, 10, 11));
    const fixture = TestBed.createComponent(RangeHost);
    fixture.componentInstance.range.set(selected as DateRange<Date>);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => vi.restoreAllMocks());

  it('one button per ISO week (Monday → Sunday), not per row', async () => {
    const { fixture, root } = setup();
    await flush(fixture);
    expect(root.querySelector('thead th')!.textContent).toContain('Sunday');
    expect(weekNumbers(root)).toEqual(NOVEMBER_2026);
    expect(chips(root).map((chip) => chip.getAttribute('aria-label'))).toEqual([
      'Semaine 44, 1',
      'Semaine 45, 2 – 8',
      'Semaine 46, 9 – 15',
      'Semaine 47, 16 – 22',
      'Semaine 48, 23 – 29',
      'Semaine 49, 30',
    ]);
    const today = chips(root).filter((chip) =>
      chip.classList.contains('dc-week-numbers-ruler__chip--today'),
    );
    expect(today.map((chip) => chip.textContent!.trim())).toEqual(['46']);
  });

  it.each([
    ['Mon Nov 9 → Sun Nov 15', new Date(2026, 10, 9), new Date(2026, 10, 15), ['46']],
    ['Sun Nov 15 only', new Date(2026, 10, 15), new Date(2026, 10, 15), ['46']],
    ['Sun Nov 1 only', new Date(2026, 10, 1), new Date(2026, 10, 1), ['44']],
    ['Sun Nov 15 → Mon Nov 16', new Date(2026, 10, 15), new Date(2026, 10, 16), ['46', '47']],
  ])('fills the ISO weeks of the range: %s', async (_, start, end, expected) => {
    const { fixture, root } = setup(new DateRange<Date>(start, end));
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
// Popups and custom headers
// ---------------------------------------------------------------------------

/** Custom header: the ruler can be embedded in any calendar header. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'test-custom-header',
  imports: [DcWeekNumbersRuler],
  template: `<div class="custom-header">{{ label }}</div>
    <dc-week-numbers-ruler />`,
})
class CustomHeader {
  readonly label = `custom ${inject<MatCalendar<Date>>(MatCalendar).activeDate.getMonth() + 1}`;
}

@Component({
  imports: [MatDatepickerModule],
  template: `
    <mat-calendar class="inline" [headerComponent]="customHeader" [startAt]="startAt" />
    <input [matDatepicker]="picker" />
    <mat-datepicker #picker [calendarHeaderComponent]="header" [startAt]="startAt" />
    <mat-date-range-input [rangePicker]="range"
      ><input matStartDate /><input matEndDate
    /></mat-date-range-input>
    <mat-date-range-picker #range [calendarHeaderComponent]="header" [startAt]="startAt" />
  `,
})
class PickersHost {
  readonly header = DcWeekNumberHeader;
  readonly customHeader = CustomHeader;
  readonly startAt = new Date(2026, 10, 5);
  readonly picker = viewChild.required<MatDatepicker<Date>>('picker');
  readonly range = viewChild.required<MatDateRangePicker<Date>>('range');
}

describe('DcWeekNumberHeader — popups and custom headers', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: fr },
        provideLabels(),
      ],
    });
    return TestBed.createComponent(PickersHost);
  }

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.remove()));

  const overlay = () => document.querySelector<HTMLElement>('.mat-datepicker-content')!;

  it('mat-datepicker: header and week numbers in the overlay', async () => {
    const fixture = setup();
    await flush(fixture);
    fixture.componentInstance.picker().open();
    await flush(fixture);
    expect(overlay().querySelector('dc-week-number-header mat-calendar-header')).not.toBeNull();
    expect(weekNumbers(overlay())).toEqual(NOVEMBER_2026);
    // Material lets the popup grow with a custom header (no fixed 354px height).
    expect(
      overlay().querySelector('.mat-datepicker-content-container-with-custom-header'),
    ).not.toBeNull();
  });

  it('mat-date-range-picker: same', async () => {
    const fixture = setup();
    await flush(fixture);
    fixture.componentInstance.range().open();
    await flush(fixture);
    expect(weekNumbers(overlay())).toEqual(NOVEMBER_2026);
  });

  it('custom header embedding <dc-week-numbers-ruler />', async () => {
    const fixture = setup();
    await flush(fixture);
    const inline = fixture.nativeElement.querySelector('mat-calendar.inline') as HTMLElement;
    expect(inline.querySelector('.custom-header')!.textContent).toBe('custom 11');
    expect(inline.querySelector('mat-calendar-header')).toBeNull();
    expect(weekNumbers(inline)).toEqual(NOVEMBER_2026);
  });
});

// ---------------------------------------------------------------------------
// date-fns specifics
// ---------------------------------------------------------------------------

describe('DcWeekNumberHeader — date-fns', () => {
  it('reports an error in dev mode and shows no week numbers with another adapter', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideNativeDateAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
        provideLabels(),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    const root = fixture.nativeElement as HTMLElement;
    await flush(fixture);
    expect(root.querySelector('mat-calendar-header')).not.toBeNull();
    expect(root.querySelector('.dc-week-numbers-ruler__group')).toBeNull();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('DateFnsAdapter'));
    error.mockRestore();
  });

  it('follows DateAdapter#setLocale() at runtime', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: fr },
        provideLabels(),
        provideDcWeekNumberFn(dcLocaleWeekNumber),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.startAt = new Date(2026, 11, 15); // December 2026
    const root = fixture.nativeElement as HTMLElement;
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

// ---------------------------------------------------------------------------
// dcWeekNumbers directive
// ---------------------------------------------------------------------------

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
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: fr },
        provideLabels(),
      ],
    });
  });

  afterEach(() => {
    warn.mockRestore();
    document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.remove());
  });

  const overlay = () => document.querySelector<HTMLElement>('.mat-datepicker-content')!;

  it('mat-calendar: applies DcWeekNumberHeader', async () => {
    const fixture = TestBed.createComponent(DirectiveHost);
    await flush(fixture);
    const inline = fixture.nativeElement.querySelector('mat-calendar.inline') as HTMLElement;
    expect(inline.querySelector('dc-week-number-header mat-calendar-header')).not.toBeNull();
    expect(weekNumbers(inline)).toEqual(NOVEMBER_2026);
    expect(warn).not.toHaveBeenCalled();
  });

  it('mat-datepicker: applies DcWeekNumberHeader in the popup', async () => {
    const fixture = TestBed.createComponent(DirectiveHost);
    await flush(fixture);
    fixture.componentInstance.picker().open();
    await flush(fixture);
    expect(overlay().querySelector('dc-week-number-header')).not.toBeNull();
    expect(weekNumbers(overlay())).toEqual(NOVEMBER_2026);
  });

  it('mat-date-range-picker: applies DcWeekNumberHeader in the popup', async () => {
    const fixture = TestBed.createComponent(DirectiveHost);
    await flush(fixture);
    fixture.componentInstance.range().open();
    await flush(fixture);
    expect(overlay().querySelector('dc-week-number-header')).not.toBeNull();
    expect(weekNumbers(overlay())).toEqual(NOVEMBER_2026);
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns in dev mode when [headerComponent] overrides the directive', async () => {
    const fixture = TestBed.createComponent(DirectiveConflictHost);
    await flush(fixture);
    const inline = fixture.nativeElement.querySelector('mat-calendar.inline') as HTMLElement;
    // The binding wins: the custom header (which embeds the ruler) is rendered.
    expect(inline.querySelector('.custom-header')).not.toBeNull();
    expect(inline.querySelector('dc-week-number-header')).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<dc-week-numbers-ruler />'));
  });
});
