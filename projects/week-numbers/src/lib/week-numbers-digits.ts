/**
 * Internal (not exported by the public API): writes week numbers with the digits of the day cells.
 *
 * Material renders day names with `Intl.DateTimeFormat(locale.code)` (`DateAdapter#getDateNames()`),
 * which follows the locale's numbering system (Arabic-Indic digits for `ar-EG`, Bengali digits
 * for `bn`…). The digits are collected from those 31 date names: they always contain each digit
 * 0-9 once the suffixes are ignored ("5." in Czech, "5日" in Japanese), and Unicode decimal digits
 * are contiguous code points, so sorting them gives their values. This holds even when the names
 * are not Gregorian day numbers (see the `fa-IR` note in the README).
 */

/**
 * The ten digits (0 → 9) used by the date names, or `null` when exactly ten decimal digits
 * cannot be found (Latin digits are then used).
 */
export function localeDigits(dateNames: readonly string[]): readonly string[] | null {
  const found = dateNames.join('').match(/\p{Nd}/gu) ?? [];
  const digits = [...new Set(found)].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
  return digits.length === 10 ? digits : null;
}

/** `week` written with `digits` (from `localeDigits()`), or with Latin digits when `null`. */
export function formatWeekNumber(week: number, digits: readonly string[] | null): string {
  const latin = String(week);
  return digits ? latin.replace(/\d/g, (d) => digits[Number(d)]) : latin;
}
