import type { DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { getISOWeek } from 'date-fns';

/**
 * Computes the number of the week that contains `date`.
 * The ruler shows one button per distinct number among the days of the displayed month, so the
 * strategy also defines which days belong to each week (and are filled, marked as today…).
 */
export type DcWeekNumberFn = (date: Date, adapter: DateFnsAdapter) => number;

/**
 * Default strategy: ISO 8601 week (Monday → Sunday), the European standard, whatever the locale.
 * With a locale whose week starts on Monday (`fr`, `de`…) each week is a row of the grid. With a
 * locale whose week starts on Sunday or Saturday, a week spans two rows: Sunday Nov 15th 2026
 * belongs to week 46 (Mon 9 → Sun 15), not to the week of the row it is displayed on.
 */
export const dcIsoWeekNumber: DcWeekNumberFn = (date) => getISOWeek(date);

/**
 * Alternative strategy: week number as defined by the date-fns locale
 * (`weekStartsOn` + `firstWeekContainsDate`), e.g. US numbering for `enUS`
 * (week 1 is the week that contains January 1st). Each week is exactly a row of the grid.
 * Goes through the adapter's `format()`, so it follows `DateAdapter#setLocale()` at runtime.
 *
 * ⚠️ date-fns locale data does not always match the official convention of the country:
 * `es` declares `firstWeekContainsDate: 1` while Spain uses ISO 8601. Prefer the ISO default
 * unless the target audience expects its locale-specific numbering.
 */
export const dcLocaleWeekNumber: DcWeekNumberFn = (date, adapter) =>
  Number(adapter.format(date, 'w'));

/**
 * Default formatter: writes the week number with the same digits as the day cells.
 *
 * `DateFnsAdapter` renders days with `Intl.DateTimeFormat(locale.code)`, which follows the
 * locale's numbering system (Arabic-Indic digits for `ar-EG`, Bengali digits for `bn`…).
 * The digits are collected from those 31 date names: they always contain each digit 0-9 once
 * the suffixes are ignored ("5." in Czech, "5日" in Japanese), and Unicode decimal digits are
 * contiguous code points, so sorting them gives their values. This holds even when the names
 * are not Gregorian day numbers (see the `fa-IR` note in the README).
 * Falls back to Latin digits if exactly ten decimal digits cannot be found.
 */
export function dcFormatWeekNumber(week: number, adapter: DateFnsAdapter): string {
  const found =
    adapter
      .getDateNames()
      .join('')
      .match(/\p{Nd}/gu) ?? [];
  const digits = [...new Set(found)].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
  if (digits.length !== 10) {
    return String(week);
  }
  return String(week).replace(/\d/g, (d) => digits[Number(d)]);
}
