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
import { DateRange, MatCalendar, MatCalendarView } from '@angular/material/datepicker';
import { MatTooltip } from '@angular/material/tooltip';
import { differenceInCalendarDays } from 'date-fns';
import { map, merge } from 'rxjs';
import { dcFormatWeekNumber, dcRowStart } from './week-number-fns';
import { DC_WEEK_NUMBER_FN } from './week-numbers-config';
import { DC_WEEK_NUMBER_INTL } from './week-numbers-intl';

/** One button per row of the month grid, in the same order. */
interface DcWeekChip {
  /** Day of the month the row starts on (≤ 0 when the row starts in the previous month). */
  readonly start: number;
  /** Week number written with the digits of the day cells. */
  readonly text: string;
  /** Days of the displayed month covered by the row, e.g. `9 – 15` (tooltip). */
  readonly days: string;
  /** Accessible label, e.g. `Week 46, 9 – 15`. */
  readonly label: string;
  /** First day of the row that belongs to the displayed month: activated on click. */
  readonly target: Date;
  /** The row contains the selected date (or a day of the selected range) in the month. */
  readonly selected: boolean;
  /** The row contains today. */
  readonly today: boolean;
  /** Every day of the row in the displayed month is out of `minDate` / `maxDate`. */
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
 * Week numbers of the displayed month: one button per row of the grid, in the same order.
 * The button of the selected date's week is filled (every week of a selected range), the current
 * week carries a dot. Like in the grid, no button is filled in the other months. Clicking a
 * week moves the active date (and the focus) to its first day in the month — or to `minDate`
 * when that day is earlier — without selecting it.
 * Hidden in the year and multi-year views.
 *
 * Meant to be rendered in a calendar header, i.e. inside `mat-calendar`: it only uses the
 * public API of `MatCalendar` (`activeDate`, `currentView`, `minDate`, `maxDate`,
 * `stateChanges`, `focusActiveCell()`), never its DOM. `DcWeekNumberHeader` combines it with
 * the standard Material header; a custom header can embed `<dc-week-ruler />` the same way.
 *
 * Requires `DateFnsAdapter` (`provideDateFnsAdapter()`), or a subclass of it, and the labels
 * (`DC_WEEK_NUMBER_INTL`).
 */
@Component({
  selector: 'dc-week-ruler',
  host: { class: 'dc-week-ruler' },
  imports: [MatTooltip],
  templateUrl: './week-ruler.html',
  styleUrl: './week-ruler.scss',
  encapsulation: ViewEncapsulation.None,
})
export class DcWeekRuler {
  private readonly calendar = inject<MatCalendar<Date>>(MatCalendar);

  private readonly weekNumberFn = inject(DC_WEEK_NUMBER_FN);

  protected readonly intl = inject(DC_WEEK_NUMBER_INTL);

  private readonly adapter = DcWeekRuler.dateFnsAdapter(inject(DateAdapter));

  private focusTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.focusTimeout));
  }

  /**
   * Snapshot of the calendar, refreshed on every state change (navigation, view, inputs such as
   * `selected`, `minDate`, `maxDate`).
   */
  private readonly state = toSignal(
    // `localeChanges`: rows follow the locale's first day of the week, digits its numbering system.
    merge(this.calendar.stateChanges, this.adapter?.localeChanges ?? []).pipe(
      map(() => this.snapshot()),
    ),
    { initialValue: this.snapshot() },
  );

  protected readonly isMonthView = computed(() => this.state().view === 'month');

  protected readonly weeks = computed<DcWeekChip[]>(() => {
    const adapter = this.adapter;
    const { activeDate, selected, minDate, maxDate } = this.state();
    const intl = this.intl();
    if (!adapter) return [];

    const year = adapter.getYear(activeDate);
    const month = adapter.getMonth(activeDate);
    const firstOfMonth = adapter.createDate(year, month, 1);
    const numDays = adapter.getNumDaysInMonth(firstOfMonth);
    // Days of the previous month on the first row.
    const offset = differenceInCalendarDays(firstOfMonth, dcRowStart(firstOfMonth, 0, adapter));
    const dayNames = adapter.getDateNames();
    const [selectionStart, selectionEnd] = DcWeekRuler.selectionBounds(selected);
    const today = adapter.today();
    const todayDay =
      adapter.getYear(today) === year && adapter.getMonth(today) === month
        ? adapter.getDate(today)
        : null;

    const chips: DcWeekChip[] = [];
    for (let row = 0, start = 1 - offset; start <= numDays; row++, start += 7) {
      const end = start + 6;
      const firstDay = Math.max(1, start);
      const lastDay = Math.min(numDays, end);
      const target = adapter.createDate(year, month, firstDay);
      const last = adapter.createDate(year, month, lastDay);
      const week = this.weekNumberFn(dcRowStart(firstOfMonth, row, adapter), adapter);
      const days =
        firstDay === lastDay
          ? dayNames[firstDay - 1]
          : `${dayNames[firstDay - 1]} – ${dayNames[lastDay - 1]}`;
      chips.push({
        start,
        text: dcFormatWeekNumber(week, adapter),
        days,
        label: intl.weekNumber(week, days),
        target,
        // Days of the row outside the month are not displayed: they do not count.
        selected:
          selectionStart !== null &&
          selectionEnd !== null &&
          adapter.compareDate(selectionStart, last) <= 0 &&
          adapter.compareDate(selectionEnd, target) >= 0,
        today: todayDay !== null && todayDay >= start && todayDay <= end,
        disabled:
          (minDate !== null && adapter.compareDate(last, minDate) < 0) ||
          (maxDate !== null && adapter.compareDate(target, maxDate) > 0),
      });
    }
    return chips;
  });

  protected activate(chip: DcWeekChip): void {
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

  private snapshot(): CalendarState {
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
        '[dcWeekRuler] Week numbers require DateFnsAdapter (provideDateFnsAdapter()). ' +
          'They are not displayed.',
      );
    }
    return null;
  }
}
