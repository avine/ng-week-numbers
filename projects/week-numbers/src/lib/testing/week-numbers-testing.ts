/**
 * Shared spec helpers (excluded from the library build: see `tsconfig.lib.json`).
 */
import {
  Component,
  inject,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type Type,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { DateRange, MatCalendar } from '@angular/material/datepicker';
import { MatTooltip } from '@angular/material/tooltip';
import { By } from '@angular/platform-browser';
import type { Locale } from 'date-fns';
import { fr } from 'date-fns/locale';
import { DcWeekNumbersHeader } from '../week-numbers-header';
import { provideDcWeekNumbersIntl, type DcWeekNumbersIntl } from '../week-numbers-intl';
import { DcWeekNumbersRuler } from '../week-numbers-ruler';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** French labels: distinct from the English defaults, so the specs see which ones are used. */
export const FR_LABELS: DcWeekNumbersIntl = {
  weekNumbers: 'Numéros de semaine',
  week: 'Sem.',
  formatWeekLabel: (week, dayRange) => `Semaine ${week}, ${dayRange}`,
};

/** ISO weeks of November 2026 (Sunday 1st → Monday 30th). */
export const NOVEMBER_2026 = ['44', '45', '46', '47', '48', '49'];

/**
 * Zoneless TestBed with `DateFnsAdapter`, the `fr` locale (Monday-first rows) and French labels,
 * then `providers` (which override them). "Today" is Wednesday, November 11th 2026 (week 46).
 */
export function setupCalendar<T>(
  component: Type<T>,
  { locale = fr, providers = [] }: { locale?: Locale; providers?: unknown[] } = {},
) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      provideDateFnsAdapter(),
      { provide: MAT_DATE_LOCALE, useValue: locale },
      provideDcWeekNumbersIntl(signal(FR_LABELS)),
      ...(providers as never[]),
    ],
  });
  vi.spyOn(TestBed.inject(DateAdapter), 'today').mockReturnValue(new Date(2026, 10, 11));
  const fixture = TestBed.createComponent(component);
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

export const flush = async (fixture: ComponentFixture<unknown>) => {
  await fixture.whenStable();
  await new Promise((r) => setTimeout(r)); // afterNextRender callbacks (focus)
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const chips = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>('.dc-week-numbers-ruler__chip'));

export const weekNumbers = (root: ParentNode) =>
  chips(root).map((chip) => chip.textContent!.trim());

/** Tooltip messages of the buttons (`matTooltip` does not set the `title` attribute). */
export const tooltips = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement
    .queryAll(By.css('.dc-week-numbers-ruler__chip'))
    .map((chip) => chip.injector.get(MatTooltip).message);

/** Week numbers of the filled buttons. */
export const selectedWeeks = (root: ParentNode) =>
  chips(root)
    .filter((chip) => chip.classList.contains('dc-week-numbers-ruler__chip--selected'))
    .map((chip) => chip.textContent!.trim());

/** Week numbers of the outlined buttons (current week). */
export const todayWeeks = (root: ParentNode) =>
  chips(root)
    .filter((chip) => chip.classList.contains('dc-week-numbers-ruler__chip--today'))
    .map((chip) => chip.textContent!.trim());

export const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

// ---------------------------------------------------------------------------
// Hosts
// ---------------------------------------------------------------------------

/** Inline calendar with `DcWeekNumbersHeader`, November 2026, single date selection. */
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
export class CalendarHost {
  readonly header = DcWeekNumbersHeader;
  startAt = new Date(2026, 10, 5); // Thursday, November 5th 2026
  readonly minDate = signal<Date | null>(null);
  readonly maxDate = signal<Date | null>(null);
  selected: Date | null = null;
  readonly calendar = viewChild.required<MatCalendar<Date>>(MatCalendar);
}

/** Inline calendar with `DcWeekNumbersHeader`, November 2026, range selection. */
@Component({
  imports: [MatCalendar],
  template: `<mat-calendar [headerComponent]="header" [startAt]="startAt" [selected]="range()" />`,
})
export class RangeHost {
  readonly header = DcWeekNumbersHeader;
  readonly startAt = new Date(2026, 10, 5);
  readonly range = signal<DateRange<Date> | null>(null);
  readonly calendar = viewChild.required<MatCalendar<Date>>(MatCalendar);
}

/** Custom header: the ruler can be embedded in any calendar header. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'test-custom-header',
  imports: [DcWeekNumbersRuler],
  template: `<div class="custom-header">{{ label }}</div>
    <dc-week-numbers-ruler />`,
})
export class CustomHeader {
  readonly label = `custom ${inject<MatCalendar<Date>>(MatCalendar).activeDate.getMonth() + 1}`;
}
