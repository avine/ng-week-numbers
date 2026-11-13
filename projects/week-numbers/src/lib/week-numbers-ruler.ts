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
import { DC_WEEK_NUMBER_FN } from './week-numbers-config';
import { formatWeekNumber, localeDigits } from './week-numbers-digits';
import { DC_WEEK_NUMBERS_INTL } from './week-numbers-intl';

/** One button per week of the displayed month, in chronological order. */
interface WeekChip {
  /** Visible week number (button content), with the digits of the day cells: `46`, `٤٦`. */
  readonly weekNumber: string;
  /** Days of the displayed month in the week, e.g. `9 – 15` (tooltip). */
  readonly dayRange: string;
  /** Read by screen readers (`aria-label`), e.g. `Week 46, 9 – 15`. */
  readonly ariaLabel: string;
  /**
   * First enabled day of the week in the displayed month (within `minDate` / `maxDate`, accepted
   * by `dateFilter`, like the day cells): activated on click. `null` when no day is enabled,
   * which disables the button.
   */
  readonly firstEnabledDate: Date | null;
  /** The week contains the selected date (or a day of the selected range) in the month. */
  readonly selected: boolean;
  /** The week contains today. */
  readonly today: boolean;
}

interface CalendarState {
  readonly activeDate: Date;
  readonly selected: Date | DateRange<Date> | null;
  readonly currentView: MatCalendarView;
  readonly minDate: Date | null;
  readonly maxDate: Date | null;
  readonly dateFilter: ((date: Date) => boolean) | null;
}

/**
 * The core of the library: `dcWeekNumbers` and `DcWeekNumbersHeader` only place this ruler in
 * the calendar header.
 *
 * Shows the week numbers of the displayed month, one button per week, in chronological order.
 * Only the days of the displayed month count: a week is shown if one of its days is in the
 * month, and its state depends on those days only.
 *
 * - **Weeks, not rows.** When the numbering and the grid start weeks on the same day (ISO weeks,
 *   Monday-first rows), each button matches a row. Otherwise a week spans two rows, and there
 *   can be more buttons than rows: with ISO weeks and `enUS` (Sunday-first rows), November 2026
 *   has 5 rows but 6 weeks (44 → 49).
 * - **Selection and today, as in the grid.** A week is filled when one of its days in the month is
 *   selected (with a range, every week it covers), and outlined when it contains today. A week
 *   whose selected day falls in the previous or next month is not filled, since the grid does
 *   not show that day.
 * - **Disabled like the day cells.** A week is disabled when none of its days in the month is
 *   enabled: out of `minDate` / `maxDate`, or rejected by `dateFilter`.
 * - **Click navigates, does not select.** It moves the active date and the focus to the first
 *   enabled day of the week in the displayed month.
 * - **Month view only.** Hidden in the year and multi-year views.
 *
 * Meant to be rendered in a calendar header, i.e. inside `mat-calendar`: it only uses the
 * public API of `MatCalendar` (`activeDate`, `selected`, `currentView`, `minDate`, `maxDate`,
 * `dateFilter`, `stateChanges`, `focusActiveCell()`), never its DOM. `DcWeekNumbersHeader` combines it with
 * the standard Material header; a custom header can embed `<dc-week-numbers-ruler />` the same way.
 *
 * Requires `DateFnsAdapter` (`provideDateFnsAdapter()`), or a subclass of it, and the labels
 * (`provideDcWeekNumbersIntl()`).
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

  private readonly adapter = asDateFnsAdapter(inject(DateAdapter));

  private focusTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.focusTimeout));
  }

  /**
   * Reactive calendar state, refreshed on every state change (navigation, view, inputs such as
   * `selected`, `minDate`, `maxDate`, `dateFilter`).
   */
  private readonly calendarState = toSignal(
    // `localeChanges`: locale weeks follow the locale, digits its numbering system.
    merge(this.calendar.stateChanges, this.adapter?.localeChanges ?? []).pipe(
      map(() => this.calendarStateSnapshot()),
    ),
    { initialValue: this.calendarStateSnapshot() },
  );

  private calendarStateSnapshot(): CalendarState {
    const { activeDate, selected, currentView, minDate, maxDate, dateFilter } = this.calendar;
    return { activeDate, selected, currentView, minDate, maxDate, dateFilter: dateFilter ?? null };
  }

  protected readonly isMonthView = computed(() => this.calendarState().currentView === 'month');

  /**
   * One chip per week of the displayed month. The adapter is not a signal: its locale is
   * read on every run, and `calendarState` re-runs this computed on `localeChanges`.
   */
  protected readonly weekChips = computed<WeekChip[]>(() => {
    // 1. No DateFnsAdapter: nothing to show (an error is logged in dev mode, see `asDateFnsAdapter`).
    //    The adapter is fixed for the component's lifetime: returning before reading any signal is safe.
    const adapter = this.adapter;
    if (!adapter) return [];

    // 2. Inputs: `calendarState` and `intl` are the only reactive dependencies.
    const { activeDate, selected, minDate, maxDate, dateFilter } = this.calendarState();
    const intl = this.intl();

    // 3. Displayed month: the month of `activeDate` (its day does not matter).
    const year = adapter.getYear(activeDate);
    const month = adapter.getMonth(activeDate);
    const numDays = adapter.getNumDaysInMonth(activeDate);

    // 4. Shared by all weeks.
    // Goal: write day ranges ("9 – 15") exactly like the grid. `String(day)` is not enough:
    // `ar-EG` shows "١٥", `cs` shows "15.". So reuse the text Material puts in each day cell
    // (index 0 = day 1). Used by the tooltip and the accessible label.
    const dateNames = adapter.getDateNames();
    // Goal: write the week number ("46") with the same digits as the grid ("٤٦" in `ar-EG`).
    // No cell shows "46": deduce the locale's ten digits 0 → 9 from the cell texts above
    // (`null`: Latin digits). Used by the visible week number of the button.
    const digits = localeDigits(dateNames);
    // Selection as a [start, end] interval (a single date: start = end).
    const [selectionStart, selectionEnd] = selectionBounds(selected);
    // Same rule as the day cells of `mat-month-view`: a day is enabled within [minDate, maxDate]
    // and when `dateFilter` accepts it.
    const isEnabled = (date: Date) =>
      (minDate === null || adapter.compareDate(date, minDate) >= 0) &&
      (maxDate === null || adapter.compareDate(date, maxDate) <= 0) &&
      (dateFilter === null || dateFilter(date));
    // Day of month of today, `null` when today is in another month.
    const today = adapter.today();
    const todayDay =
      adapter.getYear(today) === year && adapter.getMonth(today) === month
        ? adapter.getDate(today)
        : null;

    // 5. Week number of each day of the displayed month (one strategy call per day).
    //    Only the days of the displayed month count (the others are not displayed).
    const weeks = Array.from({ length: numDays }, (_, i) =>
      this.weekNumberFn(adapter.createDate(year, month, i + 1), adapter),
    );

    // 6. One chip per week: walk the days of the month in order and start a new chip each time
    //    the week number changes.
    const weekChips: WeekChip[] = [];
    for (let firstDay = 1; firstDay <= numDays;) {
      const week = weeks[firstDay - 1];
      let lastDay = firstDay;
      while (lastDay < numDays && weeks[lastDay] === week) lastDay++;
      const firstDate = adapter.createDate(year, month, firstDay);
      const lastDate = adapter.createDate(year, month, lastDay);
      let firstEnabledDate: Date | null = null;
      for (let day = firstDay; day <= lastDay && firstEnabledDate === null; day++) {
        const date = adapter.createDate(year, month, day);
        if (isEnabled(date)) firstEnabledDate = date;
      }

      // 7. Days of the month in the week, e.g. `9 – 15`, or `1`: tooltip and accessible label.
      const dayRange =
        firstDay === lastDay
          ? dateNames[firstDay - 1]
          : `${dateNames[firstDay - 1]} – ${dateNames[lastDay - 1]}`;

      // 8. Chip.
      weekChips.push({
        weekNumber: formatWeekNumber(week, digits),
        dayRange,
        ariaLabel: intl.formatWeekLabel(week, dayRange),
        firstEnabledDate,
        // Interval overlap: [selectionStart, selectionEnd] ∩ [firstDate, lastDate] ≠ ∅.
        selected:
          selectionStart !== null &&
          selectionEnd !== null &&
          adapter.compareDate(selectionStart, lastDate) <= 0 &&
          adapter.compareDate(selectionEnd, firstDate) >= 0,
        today: todayDay !== null && todayDay >= firstDay && todayDay <= lastDay,
      });
      firstDay = lastDay + 1;
    }

    // 9. Chronological order, never reordered: the `@for` tracks the chips by `$index`.
    return weekChips;
  });

  protected activate(chip: WeekChip): void {
    // Disabled chips cannot be clicked: this guard only narrows the type.
    if (chip.firstEnabledDate === null) return;
    // Moves the active cell, does not select it.
    this.calendar.activeDate = chip.firstEnabledDate;
    // Material only draws the focus indicator of the active day for a keyboard / program focus.
    // The CDK FocusMonitor attributes a focus to the mouse until a 1ms timer, started on
    // mousedown, expires; Material moves the focus with a 0ms timer. On a fast click (trackpad
    // tap: mousedown and click dispatched at once) the day would be focused "by the mouse" and
    // stay white. A 1ms timer started now always runs after the CDK one (same delay, started
    // later), so the focus is attributed to the program and the day turns grey.
    clearTimeout(this.focusTimeout);
    this.focusTimeout = setTimeout(() => this.calendar.focusActiveCell(), 1);
  }
}

/** First and last selected days; an incomplete range counts as its single date. */
function selectionBounds(selected: Date | DateRange<Date> | null): [Date | null, Date | null] {
  if (!(selected instanceof DateRange)) return [selected, selected];
  const start = selected.start ?? selected.end;
  const end = selected.end ?? selected.start;
  return [start, end];
}

/**
 * The application's adapter as a `DateFnsAdapter`, or `null` (and an error logged in dev mode)
 * when the application uses another adapter: the ruler then shows nothing.
 */
function asDateFnsAdapter(adapter: DateAdapter<unknown>): DateFnsAdapter | null {
  if (adapter instanceof DateFnsAdapter) return adapter;
  if (isDevMode()) {
    console.error(
      'DcWeekNumbersRuler: Week numbers require DateFnsAdapter (provideDateFnsAdapter()). They are not displayed.',
    );
  }
  return null;
}
