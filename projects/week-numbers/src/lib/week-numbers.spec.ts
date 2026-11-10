import {
  ApplicationRef,
  Component,
  inject,
  provideZonelessChangeDetection,
  signal,
  Type,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DateFnsAdapter, provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { DateAdapter, MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import {
  MatCalendar,
  MatDatepicker,
  MatDatepickerModule,
  MatDateRangePicker,
} from '@angular/material/datepicker';
import type { Locale } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import {
  dcIsoWeekNumber,
  dcLocaleWeekNumber,
  DcWeekNumberHeader,
  DcWeekNumbers,
  DcWeekNumbersController,
  DcWeekNumbersIntl,
  provideDcWeekNumbers,
} from '../public-api';

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
  ])('dcIsoWeekNumber, fr: row containing %s → %i', (iso, expected) => {
    const adapter = adapterFor(fr);
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const rowStart = new Date(y, m - 1, d - ((date.getDay() + 6) % 7)); // Monday-first rows
    expect(dcIsoWeekNumber(rowStart, adapter)).toBe(expected);
  });

  it('enUS (Sunday-first rows): ISO by default, US numbering with dcLocaleWeekNumber', () => {
    const adapter = adapterFor(enUS);
    const rowStart = new Date(2026, 11, 27); // Sunday Dec 27 2026 → Sat Jan 2 2027
    expect(dcIsoWeekNumber(rowStart, adapter)).toBe(53); // ISO week of Monday Dec 28
    expect(dcLocaleWeekNumber(rowStart, adapter)).toBe(1); // US: week containing Jan 1
  });
});

@Component({
  imports: [MatCalendar, DcWeekNumbers],
  template: `<mat-calendar dcWeekNumbers [startAt]="startAt" />`,
})
class Host {
  startAt = new Date(2026, 10, 5); // November 2026
}

const flush = async () => {
  await TestBed.inject(ApplicationRef).whenStable();
  await new Promise((r) => setTimeout(r)); // let the MutationObserver run
};

function weekNumbers(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('tbody .dc-week-number-content')).map(
    (el) => el.textContent ?? '',
  );
}

describe('DcWeekNumbers', () => {
  function setup(extraProviders: unknown[] = []) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: fr },
        ...(extraProviders as never[]),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    return { fixture, root: fixture.nativeElement as HTMLElement };
  }

  it('adds a column with the ISO weeks of the month', async () => {
    const { root } = setup();
    await flush();
    expect(root.querySelector('mat-calendar')!.classList).toContain('dc-week-numbers');
    expect(weekNumbers(root)).toEqual(['44', '45', '46', '47', '48', '49']);
    expect(root.querySelectorAll('thead tr:first-child th')).toHaveLength(8);
    expect(
      root.querySelector<HTMLTableCellElement>('.mat-calendar-table-header-divider')!.colSpan,
    ).toBe(8);
  });

  it('follows month navigation', async () => {
    const { root } = setup();
    await flush();
    root.querySelector<HTMLButtonElement>('.mat-calendar-next-button')!.click();
    await flush();
    // December 2026: separate label row (empty cell) then weeks 49 → 53
    expect(weekNumbers(root)).toEqual(['49', '50', '51', '52', '53']);
    expect(root.querySelectorAll('tbody .dc-week-number')).toHaveLength(6);
  });

  it('adds nothing in the year / multi-year views', async () => {
    const { root } = setup();
    await flush();
    root.querySelector<HTMLButtonElement>('.mat-calendar-period-button')!.click();
    await flush();
    expect(root.querySelectorAll('.dc-week-number')).toHaveLength(0);
  });

  it('exposes accessible labels that can be translated at runtime', async () => {
    const { root } = setup();
    await flush();
    const intl = TestBed.inject(DcWeekNumbersIntl);
    intl.weekLabel.set((n) => `Week ${n}`);
    await flush();
    const firstRowHeader = root.querySelector('tbody th.dc-week-number[scope="row"]')!;
    expect(firstRowHeader.querySelector('.cdk-visually-hidden')!.textContent).toBe('Week 44');
  });

  it('accepts a custom numbering strategy', async () => {
    const { root } = setup([provideDcWeekNumbers({ weekNumberFn: () => 0 })]);
    await flush();
    expect(new Set(weekNumbers(root))).toEqual(new Set(['0']));
  });
});

// ---------------------------------------------------------------------------
// Alternative header
// ---------------------------------------------------------------------------

/** Minimal custom header: proves it receives the calendar's injector. */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'test-custom-header',
  template: `<div class="custom-header">{{ label() }}</div>`,
})
class CustomHeader {
  private readonly calendar = inject<MatCalendar<Date>>(MatCalendar);
  readonly label = signal(`custom ${this.calendar.activeDate.getMonth() + 1}`);
}

/** Custom header that already embeds the controller (must not duplicate the column). */
@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'test-header-with-controller',
  hostDirectives: [DcWeekNumbersController],
  template: `<div class="custom-header">with controller</div>`,
})
class HeaderWithController {}

@Component({
  imports: [MatCalendar, MatDatepickerModule, DcWeekNumbers],
  template: `
    <mat-calendar class="inline" [dcWeekNumbers]="header()" [startAt]="startAt" />
    <input [matDatepicker]="picker" />
    <mat-datepicker #picker [dcWeekNumbers]="header()" [startAt]="startAt" />
    <mat-date-range-input [rangePicker]="range"
      ><input matStartDate /><input matEndDate
    /></mat-date-range-input>
    <mat-date-range-picker #range [dcWeekNumbers]="header()" [startAt]="startAt" />
  `,
})
class CustomHost {
  readonly header = signal<Type<unknown>>(CustomHeader);
  readonly startAt = new Date(2026, 10, 5);
  readonly picker = viewChild.required<MatDatepicker<Date>>('picker');
  readonly range = viewChild.required<MatDateRangePicker<Date>>('range');
}

@Component({
  imports: [MatDatepickerModule, DcWeekNumbers],
  template: `
    <input [matDatepicker]="picker" />
    <mat-datepicker #picker dcWeekNumbers [calendarHeaderComponent]="header" />
  `,
})
class ConflictHost {
  readonly header = CustomHeader;
}

describe('DcWeekNumbers — alternative header', () => {
  const providers = [
    provideZonelessChangeDetection(),
    provideDateFnsAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: fr },
  ];

  afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((el) => el.remove()));

  function overlay(): HTMLElement {
    return document.querySelector<HTMLElement>('.mat-datepicker-content')!;
  }

  it('inline: renders the given header (with access to MatCalendar) and the column', async () => {
    TestBed.configureTestingModule({ providers });
    const fixture = TestBed.createComponent(CustomHost);
    await flush();
    const inline = fixture.nativeElement.querySelector('mat-calendar.inline') as HTMLElement;
    expect(inline.querySelector('.custom-header')!.textContent).toBe('custom 11');
    expect(inline.querySelector('mat-calendar-header')).toBeNull();
    expect(weekNumbers(inline)).toEqual(['44', '45', '46', '47', '48', '49']);
  });

  it('popup mat-datepicker: the given header is rendered in the overlay', async () => {
    TestBed.configureTestingModule({ providers });
    const fixture = TestBed.createComponent(CustomHost);
    await flush();
    fixture.componentInstance.picker().open();
    await flush();
    expect(overlay().querySelector('.custom-header')).not.toBeNull();
    expect(overlay().querySelector('mat-calendar-header')).toBeNull();
    expect(weekNumbers(overlay())).toEqual(['44', '45', '46', '47', '48', '49']);
  });

  it('mat-date-range-picker: same', async () => {
    TestBed.configureTestingModule({ providers });
    const fixture = TestBed.createComponent(CustomHost);
    await flush();
    fixture.componentInstance.range().open();
    await flush();
    expect(overlay().querySelector('.custom-header')).not.toBeNull();
    expect(weekNumbers(overlay())).toHaveLength(6);
  });

  it('header that already embeds the controller: a single column', async () => {
    TestBed.configureTestingModule({ providers });
    const fixture = TestBed.createComponent(CustomHost);
    fixture.componentInstance.header.set(HeaderWithController);
    await flush();
    const inline = fixture.nativeElement.querySelector('mat-calendar.inline') as HTMLElement;
    expect(inline.querySelectorAll('thead .dc-week-number')).toHaveLength(1);
    expect(weekNumbers(inline)).toEqual(['44', '45', '46', '47', '48', '49']);
  });

  it('[dcWeekNumbers]="DcWeekNumberHeader": no recursion, standard header', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers });
    const fixture = TestBed.createComponent(CustomHost);
    fixture.componentInstance.header.set(DcWeekNumberHeader);
    await flush();
    const inline = fixture.nativeElement.querySelector('mat-calendar.inline') as HTMLElement;
    expect(inline.querySelector('mat-calendar-header')).not.toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('warns in dev mode when [calendarHeaderComponent] overrides the directive header', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({ providers });
    TestBed.createComponent(ConflictHost);
    await flush();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[dcWeekNumbers]="MyHeader"'));
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// date-fns specifics
// ---------------------------------------------------------------------------

describe('DcWeekNumbers — date-fns', () => {
  it('reports an error in dev mode and adds no column with another adapter', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideNativeDateAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
      ],
    });
    const root = TestBed.createComponent(Host).nativeElement as HTMLElement;
    await flush();
    expect(root.querySelectorAll('.dc-week-number')).toHaveLength(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('DateFnsAdapter'));
    error.mockRestore();
  });

  it('follows DateAdapter#setLocale() at runtime', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: fr },
        provideDcWeekNumbers({ weekNumberFn: dcLocaleWeekNumber }),
      ],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.startAt = new Date(2026, 11, 15); // December 2026
    const root = fixture.nativeElement as HTMLElement;
    await flush();
    // fr: Monday-first rows, last row Mon Dec 28 → week 53
    expect(weekNumbers(root).at(-1)).toBe('53');

    TestBed.inject(DateAdapter).setLocale(enUS);
    fixture.detectChanges();
    await flush();
    // enUS: Sunday-first rows, last row Sun Dec 27 → US week 1 of 2027
    expect(root.querySelector('thead th:nth-child(2)')!.textContent).toContain('Sunday');
    expect(weekNumbers(root).at(-1)).toBe('1');
  });
});
