import { formatWeekNumber, localeDigits } from './week-numbers-digits';

/** Date names as `DateAdapter#getDateNames()` returns them: days 1 → 31. */
const dateNames = (locale: string) =>
  Array.from({ length: 31 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { day: 'numeric', timeZone: 'utc' }).format(
      Date.UTC(2017, 0, i + 1),
    ),
  );

describe('localeDigits / formatWeekNumber', () => {
  it('Latin digits', () => {
    const digits = localeDigits(dateNames('fr'));
    expect(digits).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(formatWeekNumber(46, digits)).toBe('46');
  });

  it('Arabic-Indic digits (ar-EG)', () => {
    const digits = localeDigits(dateNames('ar-EG'));
    expect(formatWeekNumber(46, digits)).toBe('٤٦');
    expect(formatWeekNumber(10, digits)).toBe('١٠');
  });

  it('ignores the suffixes of the date names ("5." in Czech, "5日" in Japanese)', () => {
    expect(localeDigits(dateNames('cs'))?.join('')).toBe('0123456789');
    expect(localeDigits(dateNames('ja'))?.join('')).toBe('0123456789');
  });

  it('falls back to Latin digits when ten digits cannot be found', () => {
    const digits = localeDigits(['1', '2', '3']);
    expect(digits).toBeNull();
    expect(formatWeekNumber(46, digits)).toBe('46');
  });
});
