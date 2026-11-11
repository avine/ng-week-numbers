import {
  afterNextRender,
  afterRenderEffect,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  isDevMode,
} from '@angular/core';
import { DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { DateAdapter } from '@angular/material/core';
import { MatCalendar } from '@angular/material/datepicker';
import { dcFormatWeekNumber, dcRowStart } from './week-number-fns';
import { DC_WEEK_NUMBER_FN } from './week-numbers-config';
import { DC_WEEK_NUMBER_INTL, DcWeekNumbersIntl } from './week-numbers-intl';

const CELL_CLASS = 'dc-week-number';
const HOST_CLASS = 'dc-week-numbers';
const OBSERVER_OPTIONS: MutationObserverInit = {
  childList: true,
  subtree: true,
  characterData: true,
};

/**
 * Calendars already handled. Two controllers on the same calendar (e.g. an alternative header
 * that embeds `DcWeekNumbersController` itself and is passed to `[dcWeekNumbersCalendarHeader]`) would fight
 * over the DOM: only the first one acts.
 */
const claimedCalendars = new WeakSet<HTMLElement>();

/**
 * Adds the week number column to the calendar.
 *
 * Meant to be applied (through `hostDirectives`) to a calendar header component: Material
 * instantiates the header *inside* the `mat-calendar`, which gives access to `MatCalendar`.
 * `DcWeekNumberHeader` uses it; a custom header can do the same.
 *
 * Requires `DateFnsAdapter` (`provideDateFnsAdapter()`), or a subclass of it, and the labels
 * (`DC_WEEK_NUMBER_INTL`).
 *
 * ⚠️ Relies on the internal DOM of `mat-month-view` (`.mat-calendar-table`, `data-mat-row`),
 * verified against Angular Material 22.2. Re-test on every Material upgrade.
 */
@Directive({ selector: '[dcWeekNumbersController]' })
export class DcWeekNumbersController {
  private readonly calendar = inject<MatCalendar<Date>>(MatCalendar);
  private readonly adapter = inject(DateAdapter);
  private readonly weekNumberFn = inject(DC_WEEK_NUMBER_FN);
  private readonly intl = inject(DC_WEEK_NUMBER_INTL);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private root: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private dateFns: DateFnsAdapter | null = null;

  constructor() {
    const destroyRef = inject(DestroyRef);

    // Browser only (no-op during SSR), works zoneless.
    afterNextRender(() => {
      if (!(this.adapter instanceof DateFnsAdapter)) {
        if (isDevMode()) {
          console.error(
            '[dcWeekNumbers] Week numbers require DateFnsAdapter (provideDateFnsAdapter()). ' +
              'The column is not displayed.',
          );
        }
        return;
      }
      const root = this.host.nativeElement.closest<HTMLElement>('mat-calendar');
      if (!root || claimedCalendars.has(root)) return;
      claimedCalendars.add(root);
      this.dateFns = this.adapter;
      this.root = root;
      root.classList.add(HOST_CLASS);
      // The calendar body is re-rendered on every navigation (month, year view…):
      // the column is re-applied on every mutation.
      this.observer = new MutationObserver(() => this.refresh());
      this.refresh();
    });

    // Re-render when the labels change (language switch at runtime).
    afterRenderEffect(() => {
      this.intl();
      this.refresh();
    });

    destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      if (this.root) {
        claimedCalendars.delete(this.root);
        this.root.classList.remove(HOST_CLASS);
      }
    });
  }

  private refresh(): void {
    if (!this.root || !this.observer) return;
    this.observer.disconnect(); // our own mutations must not trigger the observer again
    try {
      this.decorate(this.root);
    } finally {
      this.observer.takeRecords();
      this.observer.observe(this.root, OBSERVER_OPTIONS);
    }
  }

  private decorate(root: HTMLElement): void {
    root.querySelectorAll(`.${CELL_CLASS}`).forEach((el) => el.remove());
    const adapter = this.dateFns;
    if (!adapter || this.calendar.currentView !== 'month') return;
    const intl = this.intl();

    const table = root.querySelector<HTMLTableElement>('.mat-calendar-table');
    const thead = table?.tHead;
    const tbody = table?.tBodies[0];
    if (!thead || !tbody) return;

    // Header: weekdays row + divider row.
    const [weekdaysRow, dividerRow] = Array.from(thead.rows);
    weekdaysRow?.prepend(this.createHeaderCell(intl));
    const divider = dividerRow?.cells[0];
    if (divider) divider.colSpan = weekdaysRow?.cells.length ?? 8;

    // Body: one cell per row. Month label row (e.g. "NOV.") → empty cell.
    const active = this.calendar.activeDate;
    const firstOfMonth = new Date(active.getFullYear(), active.getMonth(), 1);

    for (const tr of Array.from(tbody.rows)) {
      const dayCell = tr.querySelector<HTMLElement>('[data-mat-row]');
      if (!dayCell) {
        tr.prepend(this.createEmptyCell());
        continue;
      }
      const rowStart = dcRowStart(firstOfMonth, Number(dayCell.dataset['matRow']), adapter);
      const week = this.weekNumberFn(rowStart, adapter);
      tr.prepend(this.createWeekCell(intl, week, dcFormatWeekNumber(week, adapter)));
    }
  }

  private createHeaderCell(intl: DcWeekNumbersIntl): HTMLTableCellElement {
    const th = document.createElement('th');
    th.className = CELL_CLASS;
    th.scope = 'col';
    th.append(
      this.span(intl.week, 'cdk-visually-hidden'),
      this.span(intl.shortWeek, undefined, true),
    );
    return th;
  }

  private createWeekCell(
    intl: DcWeekNumbersIntl,
    week: number,
    displayed: string,
  ): HTMLTableCellElement {
    const th = document.createElement('th');
    th.className = CELL_CLASS;
    th.scope = 'row';
    th.append(
      this.span(intl.weekNumber(week), 'cdk-visually-hidden'),
      this.span(displayed, `${CELL_CLASS}-content`, true),
    );
    return th;
  }

  private createEmptyCell(): HTMLTableCellElement {
    const td = document.createElement('td');
    td.className = CELL_CLASS;
    td.setAttribute('aria-hidden', 'true');
    return td;
  }

  private span(text: string, className?: string, ariaHidden = false): HTMLSpanElement {
    const span = document.createElement('span');
    span.textContent = text;
    if (className) span.className = className;
    if (ariaHidden) span.setAttribute('aria-hidden', 'true');
    return span;
  }
}
