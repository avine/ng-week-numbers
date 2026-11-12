import {
  Component,
  computed,
  DestroyRef,
  inject,
  isDevMode,
  ViewEncapsulation,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { DateAdapter } from '@angular/material/core';
import { DateRange, MatCalendar, type MatCalendarView } from '@angular/material/datepicker';
import { MatTooltip } from '@angular/material/tooltip';
import { map, merge } from 'rxjs';
import { dcFormatWeekNumber } from './week-number-fns';
import { DC_WEEK_NUMBER_FN } from './week-numbers-config';
import { DC_WEEK_NUMBERS_INTL } from './week-numbers-intl';

/** One button per week of the displayed month, in chronological order. */
interface WeekChip {
  /** First day of the month that belongs to the week (`@for` track key). */
  readonly firstDay: number;
  /** Week number written with the digits of the day cells. */
  readonly text: string;
  /** Days of the displayed month in the week, e.g. `9 – 15` (tooltip). */
  readonly days: string;
  /** Accessible label, e.g. `Week 46, 9 – 15`. */
  readonly label: string;
  /** First day of the week that belongs to the displayed month: activated on click. */
  readonly target: Date;
  /** The week contains the selected date (or a day of the selected range) in the month. */
  readonly selected: boolean;
  /** The week contains today. */
  readonly today: boolean;
  /** Every day of the week in the displayed month is out of `minDate` / `maxDate`. */
  readonly disabled: boolean;
}

interface CalendarState {
  readonly activeDate: Date;
  readonly selected: DateRange<Date> | Date | null;
  readonly view: MatCalendarView;
  readonly minDate: Date | null;
  readonly maxDate: Date | null;
}

/**
 * Week numbers of the displayed month: one button per week that has days in the month, in
 * chronological order. A week is a row of the grid when the numbering and the locale start the
 * week on the same day; otherwise (ISO weeks with Sunday-first rows) it spans two rows.
 * The button of the selected date's week is filled (every week of a selected range), the current
 * week carries a dot. Like in the grid, no button is filled in the other months. Clicking a
 * week moves the active date (and the focus) to its first day in the month — or to `minDate`
 * when that day is earlier — without selecting it.
 * Hidden in the year and multi-year views.
 *
 * Meant to be rendered in a calendar header, i.e. inside `mat-calendar`: it only uses the
 * public API of `MatCalendar` (`activeDate`, `currentView`, `minDate`, `maxDate`,
 * `stateChanges`, `focusActiveCell()`), never its DOM. `DcWeekNumberHeader` combines it with
 * the standard Material header; a custom header can embed `<dc-week-numbers-ruler />` the same way.
 *
 * Requires `DateFnsAdapter` (`provideDateFnsAdapter()`), or a subclass of it, and the labels
 * (`DC_WEEK_NUMBERS_INTL`).
 */
@Component({
  selector: 'dc-week-numbers-ruler',
  host: { class: 'dc-week-numbers-ruler' },
  imports: [MatTooltip],
  templateUrl: './week-numbers-ruler.html',
  styleUrl: './week-numbers-ruler.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DcWeekNumbersRuler {
  private readonly calendar = inject<MatCalendar<Date>>(MatCalendar);

  private readonly weekNumberFn = inject(DC_WEEK_NUMBER_FN);

  protected readonly intl = inject(DC_WEEK_NUMBERS_INTL);

  private readonly adapter = DcWeekNumbersRuler.dateFnsAdapter(inject(DateAdapter));

  private focusTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.focusTimeout));
  }

  /**
   * Reactive calendar state, refreshed on every state change (navigation, view, inputs such as
   * `selected`, `minDate`, `maxDate`).
   */
  private readonly calendarState = toSignal(
    // `localeChanges`: locale weeks follow the locale, digits its numbering system.
    merge(this.calendar.stateChanges, this.adapter?.localeChanges ?? []).pipe(
      map(() => this.calendarStateSnapshot()),
    ),
    { initialValue: this.calendarStateSnapshot() },
  );

  protected readonly isMonthView = computed(() => this.calendarState().view === 'month');

  /**
   * One chip per week of the displayed month. The adapter is not a signal: its locale is
   * read on every run, and `state` re-runs this computed on `localeChanges`.
   */
  protected readonly weekChips = computed<WeekChip[]>(() => {
    // 1. Inputs: `state` and `intl` are the only reactive dependencies.
    const adapter = this.adapter;
    const { activeDate, selected, minDate, maxDate } = this.calendarState();
    const intl = this.intl();
    if (!adapter) return [];

    // 2. Displayed month: the month of `activeDate` (its day does not matter).
    const year = adapter.getYear(activeDate);
    const month = adapter.getMonth(activeDate);
    const numDays = adapter.getNumDaysInMonth(adapter.createDate(year, month, 1));

    // 3. Shared by all weeks: day labels as written in the cells, selection as a
    //    [start, end] interval, day of month of today (null when today is in another month).
    const dayNames = adapter.getDateNames();
    const [selectionStart, selectionEnd] = DcWeekNumbersRuler.selectionBounds(selected);
    const today = adapter.today();
    const todayDay =
      adapter.getYear(today) === year && adapter.getMonth(today) === month
        ? adapter.getDate(today)
        : null;

    // 4. One iteration per week: the days of the month with the same number are consecutive.
    //    Only the days of the displayed month count (the others are not displayed).
    const weekChips: WeekChip[] = [];
    for (let firstDay = 1; firstDay <= numDays;) {
      const target = adapter.createDate(year, month, firstDay);
      const week = this.weekNumberFn(target, adapter);
      let lastDay = firstDay;
      while (
        lastDay < numDays &&
        this.weekNumberFn(adapter.createDate(year, month, lastDay + 1), adapter) === week
      ) {
        lastDay++;
      }
      const last = adapter.createDate(year, month, lastDay);

      // 5. Tooltip: days of the month in the week, e.g. `9 – 15`, or `1`.
      const days =
        firstDay === lastDay
          ? dayNames[firstDay - 1]
          : `${dayNames[firstDay - 1]} – ${dayNames[lastDay - 1]}`;

      // 6. Chip.
      weekChips.push({
        firstDay,
        text: dcFormatWeekNumber(week, adapter),
        days,
        label: intl.formatWeekLabel(week, days),
        target,
        // Interval overlap: [selectionStart, selectionEnd] ∩ [target, last] ≠ ∅.
        selected:
          selectionStart !== null &&
          selectionEnd !== null &&
          adapter.compareDate(selectionStart, last) <= 0 &&
          adapter.compareDate(selectionEnd, target) >= 0,
        today: todayDay !== null && todayDay >= firstDay && todayDay <= lastDay,
        // Every day of the week in the month is out of [minDate, maxDate].
        disabled:
          (minDate !== null && adapter.compareDate(last, minDate) < 0) ||
          (maxDate !== null && adapter.compareDate(target, maxDate) > 0),
      });
      firstDay = lastDay + 1;
    }

    // 7. Chronological order; `firstDay` is the `@for` track key.
    return weekChips;
  });

  protected activate(chip: WeekChip): void {
    // Clamped to minDate / maxDate by MatCalendar. Moves the active cell, does not select it.
    this.calendar.activeDate = chip.target;
    // Material only draws the focus indicator of the active day for a keyboard / program focus.
    // The CDK FocusMonitor attributes a focus to the mouse until a 1ms timer, started on
    // mousedown, expires; Material moves the focus with a 0ms timer. On a fast click (trackpad
    // tap: mousedown and click dispatched at once) the day would be focused "by the mouse" and
    // stay white. A 1ms timer started now always runs after the CDK one (same delay, started
    // later), so the focus is attributed to the program and the day turns grey.
    clearTimeout(this.focusTimeout);
    this.focusTimeout = setTimeout(() => this.calendar.focusActiveCell(), 1);
  }

  private calendarStateSnapshot(): CalendarState {
    const { activeDate, selected, currentView, minDate, maxDate } = this.calendar;
    return { activeDate, selected, view: currentView, minDate, maxDate };
  }

  /** First and last selected days; an incomplete range counts as its single date. */
  private static selectionBounds(
    selected: DateRange<Date> | Date | null,
  ): [Date | null, Date | null] {
    if (!(selected instanceof DateRange)) return [selected, selected];
    const start = selected.start ?? selected.end;
    const end = selected.end ?? selected.start;
    return [start, end];
  }

  private static dateFnsAdapter(adapter: DateAdapter<unknown>): DateFnsAdapter | null {
    if (adapter instanceof DateFnsAdapter) return adapter;
    if (isDevMode()) {
      console.error(
        'DcWeekNumbersRuler: Week numbers require DateFnsAdapter (provideDateFnsAdapter()). They are not displayed.',
      );
    }
    return null;
  }
}
