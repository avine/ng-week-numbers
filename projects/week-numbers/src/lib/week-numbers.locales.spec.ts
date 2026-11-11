import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateFnsAdapter, provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatCalendar } from '@angular/material/datepicker';
import { format, type Locale } from 'date-fns';
import * as dateFnsLocales from 'date-fns/locale';
import {
  DC_WEEK_NUMBER_INTL,
  dcIsoWeekNumber,
  dcLocaleWeekNumber,
  DcWeekNumberHeader,
} from '../public-api';

/**
 * Checks every locale shipped by date-fns against independent oracles:
 * - week numbers are recomputed from their definition (no date-fns, no component code);
 * - expected digits come from the numbering system Intl resolves for the locale;
 * - rows are located from the rendered grid (day number + column), and matched in order with the
 *   week buttons of the header.
 */

const locales = Object.entries(dateFnsLocales as Record<string, Locale>);

// ---------------------------------------------------------------------------
// Oracles
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** Day number independent of time zones and DST. */
const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;

/** First day (as a day number) of week 1 of `year`. */
function weekYearStart(year: number, weekStartsOn: number, firstWeekContainsDate: number): number {
  const anchor = new Date(year, 0, firstWeekContainsDate);
  return dayNumber(anchor) - ((anchor.getDay() - weekStartsOn + 7) % 7);
}

/** Week number by definition: week 1 is the week that contains January `firstWeekContainsDate`. */
function oracleWeek(date: Date, weekStartsOn: number, firstWeekContainsDate: number): number {
  const day = dayNumber(date);
  let year = date.getFullYear();
  if (day >= weekYearStart(year + 1, weekStartsOn, firstWeekContainsDate)) year++;
  else if (day < weekYearStart(year, weekStartsOn, firstWeekContainsDate)) year--;
  return Math.floor((day - weekYearStart(year, weekStartsOn, firstWeekContainsDate)) / 7) + 1;
}

/** ISO 8601 is the special case "weeks start on Monday, week 1 contains January 4th". */
const oracleIsoWeek = (date: Date) => oracleWeek(date, 1, 4);

const stripBidi = (text: string) => text.replace(/[‎‏؜]/g, '').trim();

/** Number formatting in the numbering system Intl uses for the locale's day names. */
function numberingFor(locale: Locale) {
  const numberingSystem = new Intl.DateTimeFormat(locale.code, { day: 'numeric' }).resolvedOptions()
    .numberingSystem;
  const format = new Intl.NumberFormat('en', { numberingSystem, useGrouping: false });
  const digits = Array.from({ length: 10 }, (_, i) => format.format(i));
  return {
    numberingSystem,
    format: (n: number) => format.format(n),
    // Day names may carry a suffix ("5." in Czech, "5日" in Japanese): keep the digits only.
    parse: (text: string) =>
      Number(
        Array.from(stripBidi(text))
          .map((c) => digits.indexOf(c))
          .filter((d) => d >= 0)
          .join(''),
      ),
  };
}

// ---------------------------------------------------------------------------
// Pure strategies, every day from 2000 to 2040
// ---------------------------------------------------------------------------

describe.each(locales)('strategies — %s', (_, locale) => {
  it('dcIsoWeekNumber and dcLocaleWeekNumber match their definition for every row', () => {
    TestBed.configureTestingModule({
      providers: [provideDateFnsAdapter(), { provide: MAT_DATE_LOCALE, useValue: locale }],
    });
    const adapter = TestBed.inject(DateAdapter) as DateFnsAdapter;
    const weekStartsOn = locale.options?.weekStartsOn ?? 0;
    const firstWeekContainsDate = locale.options?.firstWeekContainsDate ?? 1;
    expect(adapter.getFirstDayOfWeek()).toBe(weekStartsOn);

    const mismatches: string[] = [];
    // First row start on or before Jan 1st 2000, then every week until 2040.
    const start = new Date(2000, 0, 1);
    start.setDate(start.getDate() - ((start.getDay() - weekStartsOn + 7) % 7));
    for (
      let rowStart = start;
      rowStart.getFullYear() < 2041;
      rowStart = new Date(rowStart.getFullYear(), rowStart.getMonth(), rowStart.getDate() + 7)
    ) {
      const monday = new Date(
        rowStart.getFullYear(),
        rowStart.getMonth(),
        rowStart.getDate() + ((1 - weekStartsOn + 7) % 7),
      );
      const iso = dcIsoWeekNumber(rowStart, adapter);
      if (iso !== oracleIsoWeek(monday)) mismatches.push(`ISO ${rowStart.toDateString()}: ${iso}`);
      const local = dcLocaleWeekNumber(rowStart, adapter);
      if (local !== oracleWeek(rowStart, weekStartsOn, firstWeekContainsDate)) {
        mismatches.push(`locale ${rowStart.toDateString()}: ${local}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Rendered calendar, every month from 2024 to 2028 (includes the 53-week year 2026)
// ---------------------------------------------------------------------------

@Component({
  imports: [MatCalendar],
  template: `<mat-calendar [headerComponent]="header" />`,
})
class Host {
  readonly header = DcWeekNumberHeader;
  readonly calendar = viewChild.required(MatCalendar);
}

const flush = () => TestBed.inject(ApplicationRef).whenStable();

/**
 * Visual column of a day cell, from the rendered colspans (not `data-mat-col`, which is relative
 * to the first day of the row).
 */
function visualColumn(cell: HTMLTableCellElement): number {
  let column = 0;
  for (
    let sibling = cell.previousElementSibling;
    sibling;
    sibling = sibling.previousElementSibling
  ) {
    column += (sibling as HTMLTableCellElement).colSpan;
  }
  return column;
}

describe.each(locales)('rendered calendar — %s', (_, locale) => {
  it('one button per row, in order, with the ISO week of the row in the locale digits', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: locale },
        {
          provide: DC_WEEK_NUMBER_INTL,
          useValue: signal({ shortWeek: 'W', week: 'Week', weekNumber: (n: number) => `W${n}` }),
        },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    const root = fixture.nativeElement as HTMLElement;
    const weekStartsOn = locale.options?.weekStartsOn ?? 0;
    const numbering = numberingFor(locale);
    const mismatches: string[] = [];

    // Material renders day names with the locale's default Intl calendar. For `fa-IR` it is the
    // Persian calendar: the displayed day numbers are not Gregorian (Material issue), so dates are
    // identified from the cell's aria-label instead (date-fns `PP`, Gregorian), by matching it
    // against the labels of every day of the month.
    const labelsAreGregorian =
      numbering.parse(
        new Intl.DateTimeFormat(locale.code, { day: 'numeric', timeZone: 'utc' }).format(
          Date.UTC(2017, 0, 1),
        ),
      ) === 1;
    const dateOf = (cell: HTMLTableCellElement, year: number, month: number): Date => {
      if (labelsAreGregorian) return new Date(year, month, numbering.parse(cell.textContent!));
      const label = cell.querySelector('button')!.getAttribute('aria-label');
      for (let day = 1; day <= 31; day++) {
        const candidate = new Date(year, month, day);
        if (format(candidate, 'PP', { locale }) === label) return candidate;
      }
      return new Date(NaN);
    };

    // First render: MatCalendar resets activeDate to startAt/today on init.
    await flush();

    for (let year = 2024; year <= 2028; year++) {
      for (let month = 0; month < 12; month++) {
        // A programmatic activeDate change does not schedule change detection (zoneless).
        fixture.componentInstance.calendar().activeDate = new Date(year, month, 15);
        fixture.detectChanges();
        await flush();

        const rows = Array.from(root.querySelectorAll('tbody tr')).filter((tr) =>
          tr.querySelector('[data-mat-row]'),
        );
        if (rows.length < 4) mismatches.push(`${year}-${month + 1}: only ${rows.length} rows`);
        const chips = Array.from(root.querySelectorAll('.dc-week-ruler-chip'));
        if (chips.length !== rows.length) {
          mismatches.push(`${year}-${month + 1}: ${chips.length} buttons, ${rows.length} rows`);
        }

        for (const tr of rows) {
          const where = `${year}-${month + 1} row ${rows.indexOf(tr)}`;
          const cells = Array.from(tr.querySelectorAll<HTMLTableCellElement>('[data-mat-col]'));
          for (const cell of cells) {
            // Column alignment: column c must be weekday (weekStartsOn + c) % 7.
            const date = dateOf(cell, year, month);
            const col = visualColumn(cell);
            if (date.getMonth() !== month || date.getDay() !== (weekStartsOn + col) % 7) {
              mismatches.push(`${where}: ${date.toDateString()} in column ${col}`);
            }
          }
          const first = cells[0];
          const firstDate = dateOf(first, year, month);
          const col = visualColumn(first);
          const monday = new Date(
            year,
            month,
            firstDate.getDate() + ((1 - weekStartsOn + 7) % 7) - col,
          );
          const expected = numbering.format(oracleIsoWeek(monday));
          const actual = stripBidi(chips[rows.indexOf(tr)]?.textContent ?? '(none)');
          if (actual !== expected)
            mismatches.push(`${where}: got "${actual}", expected "${expected}"`);
        }
      }
    }

    expect(mismatches).toEqual([]);
  }, 120_000);
});
