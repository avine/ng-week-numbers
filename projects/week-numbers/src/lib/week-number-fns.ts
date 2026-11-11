import { DateFnsAdapter } from '@angular/material-date-fns-adapter';
import { addDays, type Day, getISOWeek } from 'date-fns';

/**
 * Computes the number displayed for a calendar row.
 * `rowStart` is the first day displayed on the row: rows start on the adapter's
 * `getFirstDayOfWeek()`, i.e. the date-fns locale's `weekStartsOn`.
 */
export type DcWeekNumberFn = (rowStart: Date, adapter: DateFnsAdapter) => number;

/**
 * Default strategy: ISO 8601 week of the row's Monday.
 * ISO weeks are the European standard, whatever the locale. With a locale whose week starts on
 * Monday (`fr`, `de`…) the row *is* the ISO week. With a locale whose week starts on Sunday or
 * Saturday, the row shows the ISO week of its Monday (Outlook / Google Calendar convention).
 */
export const dcIsoWeekNumber: DcWeekNumberFn = (rowStart, adapter) => {
  const toMonday = (1 - adapter.getFirstDayOfWeek() + 7) % 7;
  return getISOWeek(addDays(rowStart, toMonday));
};

/**
 * Alternative strategy: week number as defined by the date-fns locale
 * (`weekStartsOn` + `firstWeekContainsDate`), e.g. US numbering for `enUS`
 * (week 1 is the week that contains January 1st).
 * Goes through the adapter's `format()`, so it follows `DateAdapter#setLocale()` at runtime.
 *
 * ⚠️ date-fns locale data does not always match the official convention of the country:
 * `es` declares `firstWeekContainsDate: 1` while Spain uses ISO 8601. Prefer the ISO default
 * unless the target audience expects its locale-specific numbering.
 */
export const dcLocaleWeekNumber: DcWeekNumberFn = (rowStart, adapter) =>
  // Any day of the row works: the row is exactly one locale week.
  Number(adapter.format(rowStart, 'w'));

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

/** First day displayed on a given row of the month view. */
export function dcRowStart(firstOfMonth: Date, rowIndex: number, adapter: DateFnsAdapter): Date {
  const weekStartsOn = adapter.getFirstDayOfWeek() as Day;
  const offset = (firstOfMonth.getDay() - weekStartsOn + 7) % 7;
  return addDays(firstOfMonth, rowIndex * 7 - offset);
}
