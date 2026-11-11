import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DateAdapter, MAT_DATE_FORMATS } from '@angular/material/core';
import { MatCalendar } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

interface WeekChip<D> { num: number; target: D; active: boolean; today: boolean; range: string; }

function isoWeek(y: number, m: number, d: number): number {
  const t = new Date(Date.UTC(y, m, d));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((+t - +y0) / 86400000 + 1) / 7);
}

@Component({
  selector: 'app-week-header',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './week-header.component.html',
  styleUrl: './week-header.component.scss',
})
export class WeekHeaderComponent<D> {
  private calendar = inject<MatCalendar<D>>(MatCalendar);
  private adapter = inject<DateAdapter<D>>(DateAdapter);
  private formats = inject(MAT_DATE_FORMATS);

  constructor() {
    const cdr = inject(ChangeDetectorRef);
    this.calendar.stateChanges.pipe(takeUntilDestroyed()).subscribe(() => cdr.markForCheck());
  }

  get label(): string {
    return this.adapter
      .format(this.calendar.activeDate, this.formats.display.monthYearLabel)
      .toLocaleUpperCase();
  }

  get isMonthView(): boolean { return this.calendar.currentView === 'month'; }

  get weeks(): WeekChip<D>[] {
    const a = this.adapter;
    const active = this.calendar.activeDate;
    const y = a.getYear(active), m = a.getMonth(active);
    const first = a.createDate(y, m, 1);
    const days = a.getNumDaysInMonth(first);
    const offset = (a.getDayOfWeek(first) - a.getFirstDayOfWeek() + 7) % 7;
    const today = a.today();
    const isTodayMonth = a.getYear(today) === y && a.getMonth(today) === m;
    const ad = a.getDate(active);
    const td = a.getDate(today);
    const chips: WeekChip<D>[] = [];

    for (let start = 1 - offset; start <= days; start += 7) {
      const firstIn = Math.max(1, start);
      const lastIn = Math.min(days, start + 6);
      chips.push({
        num: isoWeek(y, m, firstIn),
        target: a.createDate(y, m, firstIn),
        active: ad >= start && ad <= start + 6,
        today: isTodayMonth && td >= start && td <= start + 6,
        range: `${firstIn} – ${lastIn}`,
      });
    }
    return chips;
  }

  goTo(d: D) { this.calendar.activeDate = d; }

  toggleView() {
    this.calendar.currentView = this.isMonthView ? 'multi-year' : 'month';
  }

  prev() { this.step(-1); }
  next() { this.step(1); }

  private step(dir: 1 | -1) {
    const a = this.adapter, d = this.calendar.activeDate;
    this.calendar.activeDate =
      this.calendar.currentView === 'month' ? a.addCalendarMonths(d, dir)
      : this.calendar.currentView === 'year' ? a.addCalendarYears(d, dir)
      : a.addCalendarYears(d, dir * 24);
  }
}
