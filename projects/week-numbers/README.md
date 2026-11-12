# `ng-week-numbers`

**Week numbers** (ISO 8601 by default) in the header of the Angular Material calendar:
`mat-datepicker`, `mat-date-range-picker` and inline `mat-calendar`.

Below the standard Material header, a ruler shows one button per week of the displayed month,
in chronological order. The week of the selected date is filled (every week of a selected range), the current
week carries a dot, and clicking a week moves the active date (and the focus) to its first day in
the month — or to `minDate` when that day is earlier — without selecting it. As in the grid, nothing is filled in the other months. The ruler is hidden in
the year and multi-year views.

Only the public API of `MatCalendar` is used (`activeDate`, `selected`, `currentView`, `minDate`, `maxDate`,
`stateChanges`, `focusActiveCell()`): the calendar grid and its DOM are left untouched.

Verified against **Angular / Angular Material 22.2** — zoneless, SSR-compatible (no-op on the server).

**Requires `DateFnsAdapter`** (`@angular/material-date-fns-adapter`, `date-fns` v4). With another
adapter, the week numbers are not displayed and an error is logged in dev mode.

## Installation in the library

Copy the `week-numbers/` folder to the root of the library project (next to the other secondary
entry points). Its `ng-package.json` declares it as the `ng-week-numbers` entry point.

Peer dependencies of the library: `@angular/core`, `@angular/material`,
`@angular/material-date-fns-adapter`, `date-fns`. No stylesheet to import: styles ship with the
component.

## Usage

```ts
import { DcWeekNumbers } from 'ng-week-numbers';

@Component({ imports: [MatDatepickerModule, DcWeekNumbers], … })
```

```html
<mat-datepicker dcWeekNumbers />
<mat-date-range-picker dcWeekNumbers />
<mat-calendar dcWeekNumbers />
```

The directive sets `DcWeekNumberHeader` as the calendar header (`calendarHeaderComponent` /
`headerComponent`). The header can also be bound explicitly, without the directive:

```ts
readonly weekNumberHeader = DcWeekNumberHeader;
```

```html
<mat-datepicker [calendarHeaderComponent]="weekNumberHeader" />
<mat-calendar [headerComponent]="weekNumberHeader" />
```

⚠️ Do not combine `dcWeekNumbers` with `[calendarHeaderComponent]` / `[headerComponent]`: the
binding wins and the directive has no effect (a `console.warn` reports it in dev mode). For a
custom header, see [Custom header](#custom-header).

`DcWeekNumberHeader` renders Material's own `<mat-calendar-header>` (period button, previous /
next buttons, `MatDatepickerIntl` labels, `minDate` / `maxDate` handling) followed by the week
ruler. In a popup, Material lets the panel grow with a custom header, so the extra row fits.

Rows start on the date-fns locale's `weekStartsOn` (Monday for `fr`, Sunday for `enUS`,
Saturday for `faIR`…). By default weeks are **ISO 8601** weeks (Monday → Sunday) — the European
standard, identical to the locale numbering for `fr`, where each week is a row of the grid. With
Sunday-first rows (`enUS`), an ISO week spans two rows: Sunday Nov 15th 2026 belongs to week 46
(Mon 9 → Sun 15), and November 2026 shows weeks 44 (Sunday 1st) to 49 (Monday 30th). Week numbers use the same digits
as the day cells (Arabic-Indic for `arEG`, Bengali for `bn`, Persian for `faIR`…), and follow
`DateAdapter#setLocale()` at runtime.

### Tested locales

`week-numbers.locales.spec.ts` checks **every locale exported by `date-fns/locale`** (95)
against independent oracles (week numbers recomputed from their definition, digits from the
numbering system Intl resolves, days located from the rendered DOM):

- both strategies (`dcIsoWeekNumber`, `dcLocaleWeekNumber`), every day from 2000 to 2040;
- the rendered calendar (one button per ISO week of the displayed days, in order, digits), every
  month from 2024 to 2028.

### Known limitation of Material with `faIR`

`DateFnsAdapter` renders day numbers with `Intl.DateTimeFormat(locale.code)`, whose default
calendar for `fa-IR` is the **Persian calendar**: Material shows Persian day numbers in a
Gregorian grid (e.g. January 1st is displayed as "۱۲"). This is a Material issue, independent
of this component (week numbers stay correct, but the day ranges of the tooltips use the same
Persian day numbers). Workaround at the application level: force the
Gregorian calendar in the locale code.

```ts
{ provide: MAT_DATE_LOCALE, useValue: { ...faIR, code: 'fa-IR-u-ca-gregory' } }
```

## Customization

### Labels (i18n, required)

The library ships no labels: provide them as a `Signal<DcWeekNumbersIntl>` through
`DC_WEEK_NUMBER_INTL`. Without it, a missing provider error (`NG0201`) is thrown when the
calendar is rendered: immediately for `mat-calendar`, when the popup opens for a datepicker.
The labels of the Material header itself come from `MatDatepickerIntl`, as usual.

```ts
import { signal } from '@angular/core';
import { DC_WEEK_NUMBER_INTL, type DcWeekNumbersIntl } from 'ng-week-numbers';

providers: [
  {
    provide: DC_WEEK_NUMBER_INTL,
    useValue: signal<DcWeekNumbersIntl>({
      shortWeek: 'Wk', // visible caption in front of the week numbers (keep it short)
      week: 'Week numbers', // name of the group of buttons, read by screen readers
      // label of each week button, read by screen readers: "Week 46, 9 – 15"
      // `days`: days of the displayed month in the week, also shown as tooltip
      weekNumber: (n, days) => `Week ${n}, ${days}`,
    }),
  },
];
```

To switch language at runtime, set a new object on the signal: an open calendar updates
automatically. Mutating the current object is not detected.

### Numbering

```ts
import { dcLocaleWeekNumber, provideDcWeekNumberFn } from 'ng-week-numbers';

providers: [
  // Locale numbering (weekStartsOn + firstWeekContainsDate), e.g. US numbering for enUS
  provideDcWeekNumberFn(dcLocaleWeekNumber),
];
```

| Strategy                    | Week number of a date                  |
| --------------------------- | -------------------------------------- |
| `dcIsoWeekNumber` (default) | ISO 8601 week (Monday → Sunday)        |
| `dcLocaleWeekNumber`        | week as defined by the date-fns locale |

⚠️ date-fns locale data does not always match the official convention of the country:
`es` declares `firstWeekContainsDate: 1` while Spain uses ISO 8601. Keep the ISO default unless
the audience expects its locale-specific numbering.

`provideDcWeekNumberFn()` also works in the `providers` of a component, to change the numbering
of its calendars only.

A custom `DcWeekNumberFn` (`(date: Date, adapter: DateFnsAdapter) => number`) can also be
provided (e.g. fiscal weeks). It returns the number of the week that contains `date`; the ruler
shows one button per run of consecutive days of the month sharing the same number. Week numbers are always written with the same digits as the day cells.

### Angular i18n (one build per locale)

Every build shares the same providers, so:

- `MAT_DATE_LOCALE` must follow the build's `LOCALE_ID` (day names, first day of the week);
- with the ISO default, a given date has **the same week number in every build**, which is
  usually what the business expects ("delivery in week 53");
- `dcLocaleWeekNumber` follows each build's locale instead: the last week of December 2026 is
  week **53** in `fr` (Mon Dec 28 → Sun Jan 3) but week **1** in `en-US` (Sun Dec 27 → Sat Jan 2).

Week numbering is a business convention, not a language: an app for a European audience keeps
ISO numbers in every language. Its English build should also use the `enGB` date-fns locale
rather than `enUS`: English labels, Monday-first rows, and every row is exactly one ISO week.

Only when each build targets a different **market** (e.g. `en-US` for US customers, `fr-FR` for
French ones) should the numbering follow the build. Provide `DC_WEEK_NUMBER_FN` with a factory:

```ts
import { inject, LOCALE_ID } from '@angular/core';
import { DC_WEEK_NUMBER_FN, dcIsoWeekNumber, dcLocaleWeekNumber } from 'ng-week-numbers';

providers: [
  {
    provide: DC_WEEK_NUMBER_FN,
    useFactory: () => (inject(LOCALE_ID) === 'en-US' ? dcLocaleWeekNumber : dcIsoWeekNumber),
  },
];
```

Prefer `provideDcWeekNumberFn()` otherwise: unlike a raw provider, it is type-checked.

### Theming

Colors and typography come from the Material 3 system tokens (`--mat-sys-*`) of the application
theme.

### Custom header

`DcWeekRuler` (`<dc-week-ruler />`) is the week ruler alone. Embed it in any calendar header:
Material creates the header inside `mat-calendar`, which is all the ruler needs.

```ts
@Component({
  imports: [MatCalendarHeader, DcWeekRuler],
  template: `
    <mat-calendar-header>
      <button matButton (click)="today()">Today</button>
    </mat-calendar-header>
    <dc-week-ruler />
  `,
})
export class MyHeader { … }
```

```html
<mat-datepicker [calendarHeaderComponent]="MyHeader" />
```

No `dcWeekNumbers` here: the custom header already contains the week ruler.

## Accessibility

- The ruler is a `role="group"` named by `week`; the visible caption is hidden from screen readers.
- Each week is a native `<button>` labelled by `weekNumber(n, days)` (e.g. "Week 46, 9 – 15");
  the week of the selected date carries `aria-current="true"`.
- Clicking a week moves the focus to its first day in the grid, or to `minDate` when that day is
  earlier (`MatCalendar#focusActiveCell()`):
  keyboard users continue with the arrow keys, Enter selects. It does not select the date.
- Rows entirely outside `minDate` / `maxDate` are disabled.
- Visible focus ring (`:focus-visible`), `forced-colors` support for the selected week.
- Material keyboard navigation in the grid is unaffected; the ruler follows it.

## Compatibility

Public Material API only, verified against Angular Material 22.2. The weeks of the ruler are
matched against the rows `mat-month-view` renders for the locale's first day of the week;
`week-numbers.locales.spec.ts` checks this against the rendered grid for every date-fns locale.
