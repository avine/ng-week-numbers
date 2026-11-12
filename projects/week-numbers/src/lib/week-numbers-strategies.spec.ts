import { TestBed } from '@angular/core/testing';
import { provideDateFnsAdapter, type DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import type { Locale } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import { dcIsoWeekNumber, dcLocaleWeekNumber } from './week-numbers-strategies';

/** Examples only: `week-numbers.locales.spec.ts` checks every day 2000–2040 for every locale. */
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
  ])('dcIsoWeekNumber: %s → %i', (iso, expected) => {
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

  it('dcLocaleWeekNumber follows DateAdapter#setLocale()', () => {
    const adapter = adapterFor(fr);
    const sunday = new Date(2026, 11, 27);
    expect(dcLocaleWeekNumber(sunday, adapter)).toBe(52); // fr: Monday-first, ISO-like
    adapter.setLocale(enUS);
    expect(dcLocaleWeekNumber(sunday, adapter)).toBe(1);
  });
});
