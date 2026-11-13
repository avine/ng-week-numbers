# `ng-week-numbers`

**Week numbers** (ISO 8601 by default) in the header of the Angular Material calendar:
`mat-datepicker`, `mat-date-range-picker` and inline `mat-calendar`.

Below the standard Material header, a ruler (`DcWeekNumbersRuler`) shows the week numbers of
the displayed month, one button per week, in chronological order. Only the days of the
displayed month count: a week is shown if one of its days is in the month, and its state
depends on those days only.

- **Weeks, not rows.** When the numbering and the grid start weeks on the same day (ISO weeks,
  Monday-first rows), each button matches a row. Otherwise a week spans two rows, and there can
  be more buttons than rows: with ISO weeks and `enUS` (Sunday-first rows), November 2026 has
  5 rows but 6 weeks (44 → 49).
- **Selection and today, as in the grid.** A week is filled when one of its days in the month is
  selected (with a range, every week it covers), and outlined when it contains today. A week
  whose selected day falls in the previous or next month is not filled, since the grid does not
  show that day.
- **Disabled like the day cells.** A week is disabled when none of its days in the month is
  enabled: out of `minDate` / `maxDate`, or rejected by `dateFilter`.
- **Click navigates, does not select.** It moves the active date and the focus to the first
  enabled day of the week in the displayed month.
- **Month view only.** Hidden in the year and multi-year views.

Only the public API of `MatCalendar` is used (`activeDate`, `selected`, `currentView`, `minDate`, `maxDate`,
`dateFilter`, `stateChanges`, `focusActiveCell()`): the calendar grid and its DOM are left untouched.

Verified against **Angular / Angular Material 22.2** — zoneless, SSR-compatible (no-op on the server).

**Requires `DateFnsAdapter`** (`@angular/material-date-fns-adapter`, `date-fns` v3 or v4). With another
adapter, the week numbers are not displayed and an error is logged in dev mode.

## How it fits together

Three layers, from the simplest to use to the one that does the work:

| Layer                 | What it is                                                      | Use it when                                |
| --------------------- | --------------------------------------------------------------- | ------------------------------------------ |
| `dcWeekNumbers`       | Directive: sets `DcWeekNumbersHeader` as the calendar header    | Default: one attribute                     |
| `DcWeekNumbersHeader` | Header: `<mat-calendar-header />` + `<dc-week-numbers-ruler />` | Binding the header explicitly              |
| `DcWeekNumbersRuler`  | **The week ruler itself: all the behavior lives here**          | Building a [custom header](#custom-header) |

Start with the directive; read `DcWeekNumbersRuler` to understand how the week numbers are
computed and rendered. The directive and the header only place the ruler in the calendar header.

## Installation

```sh
npm install ng-week-numbers
```

Peer dependencies: `@angular/core`, `@angular/material`, `@angular/material-date-fns-adapter`,
`date-fns`, `rxjs`. No stylesheet to import: styles ship with the component.

## Usage

Provide the labels of the ruler, in the application's language (required, no default):

```ts
import { signal } from '@angular/core';
import { provideDcWeekNumbersIntl } from 'ng-week-numbers';

providers: [
  provideDcWeekNumbersIntl(
    signal({
      weekNumbers: 'Week numbers',
      week: 'Wk',
      formatWeekLabel: (week, dayRange) => `Week ${week}, ${dayRange}`,
    }),
  ),
];
```

See [Labels (i18n)](#labels-i18n) for what each label is and how to switch language at runtime.
Then add the directive to the calendar:

```ts
import { DcWeekNumbers } from 'ng-week-numbers';

@Component({ imports: [MatDatepickerModule, DcWeekNumbers], … })
```

```html
<mat-datepicker dcWeekNumbers />
<mat-date-range-picker dcWeekNumbers />
<mat-calendar dcWeekNumbers />
```

The directive sets `DcWeekNumbersHeader` as the calendar header (`calendarHeaderComponent` /
`headerComponent`). The header can also be bound explicitly, without the directive:

```ts
readonly weekNumbersHeader = DcWeekNumbersHeader;
```

```html
<mat-datepicker [calendarHeaderComponent]="weekNumbersHeader" />
<mat-calendar [headerComponent]="weekNumbersHeader" />
```

⚠️ Do not combine `dcWeekNumbers` with `[calendarHeaderComponent]` / `[headerComponent]`: the
binding wins and the directive has no effect (a `console.warn` reports it in dev mode). For a
custom header, see [Custom header](#custom-header).

`DcWeekNumbersHeader` renders Material's own `<mat-calendar-header>` (period button, previous /
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

`week-numbers.locales.spec.ts` covers **every locale exported by `date-fns/locale`** (95) by
behavior class: the locales are grouped by the only parameters the library depends on (first
day of the week, `firstWeekContainsDate`, numbering system, calendar, shape of the day numbers),
and one locale per class (15) is checked against independent oracles (week numbers recomputed
from their definition, digits from the numbering system Intl resolves, days located from the
rendered DOM):

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

### Labels (i18n)

Labels are required, there is no default: provide a `Signal<DcWeekNumbersIntl>` with
`provideDcWeekNumbersIntl()`, for the whole application or in the `providers` of a component.
Without them, creating the ruler throws a `NullInjectorError` for `DC_WEEK_NUMBERS_INTL`. The
labels of the Material header itself come from `MatDatepickerIntl`, as usual.

```ts
import { signal } from '@angular/core';
import { provideDcWeekNumbersIntl } from 'ng-week-numbers';

providers: [
  provideDcWeekNumbersIntl(
    signal({
      weekNumbers: 'Numéros de semaine', // name of the group of buttons, read by screen readers
      week: 'Sem.', // visible caption in front of the week numbers (keep it short)
      // label of each week button, read by screen readers: "Semaine 46, 9 – 15"
      // `dayRange`: days of the displayed month in the week, also shown as tooltip
      formatWeekLabel: (week, dayRange) => `Semaine ${week}, ${dayRange}`,
    }),
  ),
];
```

`week` is a number, written with Latin digits when interpolated as is, while `dayRange` is
already written like the day cells. For a locale with other digits, format `week` yourself:

```ts
formatWeekLabel: (week, dayRange) => `الأسبوع ${week.toLocaleString('ar-EG')}، ${dayRange}`,
// "الأسبوع ٤٦، ٩ – ١٥"
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

`DcWeekNumbersRuler` (`<dc-week-numbers-ruler />`) is the week ruler alone. Embed it in any calendar header:
Material creates the header inside `mat-calendar`, which is all the ruler needs.

```ts
@Component({
  imports: [MatCalendarHeader, DcWeekNumbersRuler],
  template: `
    <mat-calendar-header>
      <button matButton (click)="today()">Today</button>
    </mat-calendar-header>
    <dc-week-numbers-ruler />
  `,
})
export class MyHeader { … }
```

Templates cannot reference a class: expose the header through a field of the component.

```ts
readonly myHeader = MyHeader;
```

```html
<mat-datepicker [calendarHeaderComponent]="myHeader" />
```

No `dcWeekNumbers` here: the custom header already contains the week ruler.

## Accessibility

- The ruler is a `role="group"` named by `weekNumbers`; the visible caption (`week`) is hidden
  from screen readers.
- Each week is a native `<button>` labelled by `formatWeekLabel(week, dayRange)` (e.g. "Week 46, 9 – 15");
  like the day cells of the grid, the current week carries `aria-current="date"` and the weeks of
  the selection `aria-pressed="true"` (both can be combined).
- Clicking a week moves the focus to its first enabled day in the grid
  (`MatCalendar#focusActiveCell()`):
  keyboard users continue with the arrow keys, Enter selects. It does not select the date.
- Weeks without any enabled day (out of `minDate` / `maxDate`, or rejected by `dateFilter`) are
  disabled.
- Visible focus ring (`:focus-visible`).
- Material keyboard navigation in the grid is unaffected; the ruler follows it.

## Compatibility

Public Material API only, verified against Angular Material 22.2. The weeks of the ruler are
matched against the rows `mat-month-view` renders for the locale's first day of the week;
`week-numbers.locales.spec.ts` checks this against the rendered grid for every date-fns locale.
