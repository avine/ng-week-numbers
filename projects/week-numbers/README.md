# `@jcdfr/ng-deco/week-numbers`

**Week number** column (ISO 8601 by default) on the left of the Angular Material calendar:
`mat-datepicker`, `mat-date-range-picker` and inline `mat-calendar`.

Verified against **Angular / Angular Material 22.2** — zoneless, SSR-compatible (no-op on the server).

**Requires `DateFnsAdapter`** (`@angular/material-date-fns-adapter`, `date-fns` v4). With another
adapter, the column is not displayed and an error is logged in dev mode.

## Installation in the library

Copy the `week-numbers/` folder to the root of the library project (next to the other secondary
entry points). Its `ng-package.json` declares it as the `@jcdfr/ng-deco/week-numbers` entry point.

Peer dependencies of the library: `@angular/core`, `@angular/material`,
`@angular/material-date-fns-adapter`, `date-fns`. No stylesheet to import: styles ship with the
component (`ViewEncapsulation.None`).

## Usage

```ts
import { DcWeekNumbers } from '@jcdfr/ng-deco/week-numbers';

@Component({ imports: [MatDatepickerModule, DcWeekNumbers], … })
```

```html
<mat-datepicker dcWeekNumbers />
<mat-date-range-picker dcWeekNumbers />
<mat-calendar dcWeekNumbers />
```

Rows start on the date-fns locale's `weekStartsOn` (Monday for `fr`, Sunday for `enUS`,
Saturday for `faIR`…). By default each row shows the **ISO 8601** week of its Monday — the
European standard, identical to the locale numbering for `fr`. Week numbers use the same digits
as the day cells (Arabic-Indic for `arEG`, Bengali for `bn`, Persian for `faIR`…), and follow
`DateAdapter#setLocale()` at runtime.

### Tested locales

`week-numbers.locales.spec.ts` checks **every locale exported by `date-fns/locale`** (95)
against independent oracles (week numbers recomputed from their definition, digits from the
numbering system Intl resolves, rows located from the rendered DOM):

- both strategies (`dcIsoWeekNumber`, `dcLocaleWeekNumber`), every week from 2000 to 2040;
- the rendered calendar (column alignment, ISO number, digits), every month from 2024 to 2028.

### Known limitation of Material with `faIR`

`DateFnsAdapter` renders day numbers with `Intl.DateTimeFormat(locale.code)`, whose default
calendar for `fa-IR` is the **Persian calendar**: Material shows Persian day numbers in a
Gregorian grid (e.g. January 1st is displayed as "۱۲"). This is a Material issue, independent
of this component (week numbers stay correct). Workaround at the application level: force the
Gregorian calendar in the locale code.

```ts
{ provide: MAT_DATE_LOCALE, useValue: { ...faIR, code: 'fa-IR-u-ca-gregory' } }
```

## Customization

### Labels (i18n, required)

The library ships no labels: provide them as a `Signal<DcWeekNumbersIntl>` through
`DC_WEEK_NUMBER_INTL`. Without it, a missing provider error (`NG0201`) is thrown when the
calendar is rendered: immediately for `mat-calendar`, when the popup opens for a datepicker.

```ts
import { signal } from '@angular/core';
import { DC_WEEK_NUMBER_INTL, type DcWeekNumbersIntl } from '@jcdfr/ng-deco/week-numbers';

providers: [
  {
    provide: DC_WEEK_NUMBER_INTL,
    useValue: signal<DcWeekNumbersIntl>({
      shortWeek: 'Wk', // visible column header (keep it short)
      week: 'Week number', // column header read by screen readers
      weekNumber: (n) => `Week ${n}`, // label of each week cell, read by screen readers
    }),
  },
];
```

To switch language at runtime, set a new object on the signal: an open calendar updates
automatically. Mutating the current object is not detected.

### Numbering

```ts
import { dcLocaleWeekNumber, provideDcWeekNumberFn } from '@jcdfr/ng-deco/week-numbers';

providers: [
  // Locale numbering (weekStartsOn + firstWeekContainsDate), e.g. US numbering for enUS
  provideDcWeekNumberFn(dcLocaleWeekNumber),
];
```

| Strategy                    | Week number of a row                   |
| --------------------------- | -------------------------------------- |
| `dcIsoWeekNumber` (default) | ISO 8601 week of the row's Monday      |
| `dcLocaleWeekNumber`        | week as defined by the date-fns locale |

⚠️ date-fns locale data does not always match the official convention of the country:
`es` declares `firstWeekContainsDate: 1` while Spain uses ISO 8601. Keep the ISO default unless
the audience expects its locale-specific numbering.

A custom `DcWeekNumberFn` (`(rowStart: Date, adapter: DateFnsAdapter) => number`) can also be
provided (e.g. fiscal weeks). Week numbers are always written with the same digits as the day
cells.

### Angular i18n (one build per locale)

Every build shares the same providers, so:

- `MAT_DATE_LOCALE` must follow the build's `LOCALE_ID` (day names, first day of the week);
- with the ISO default, a given date has **the same week number in every build**, which is
  usually what the business expects ("delivery in week 53");
- `dcLocaleWeekNumber` follows each build's locale instead: the last row of December 2026 is
  week **53** in `fr` (Mon Dec 28 → Sun Jan 3) but week **1** in `en-US` (Sun Dec 27 → Sat Jan 2).

Week numbering is a business convention, not a language: an app for a European audience keeps
ISO numbers in every language. Its English build should also use the `enGB` date-fns locale
rather than `enUS`: English labels, Monday-first rows, and every row is exactly one ISO week.

Only when each build targets a different **market** (e.g. `en-US` for US customers, `fr-FR` for
French ones) should the numbering follow the build. Provide `DC_WEEK_NUMBER_FN` with a factory:

```ts
import { inject, LOCALE_ID } from '@angular/core';
import {
  DC_WEEK_NUMBER_FN,
  dcIsoWeekNumber,
  dcLocaleWeekNumber,
} from '@jcdfr/ng-deco/week-numbers';

providers: [
  {
    provide: DC_WEEK_NUMBER_FN,
    useFactory: () => (inject(LOCALE_ID) === 'en-US' ? dcLocaleWeekNumber : dcIsoWeekNumber),
  },
];
```

Prefer `provideDcWeekNumberFn()` otherwise: unlike a raw provider, it is type-checked.

### CSS variables

| Variable                          | Default                        |
| --------------------------------- | ------------------------------ |
| `--dc-week-numbers-column-width`  | `28px`                         |
| `--dc-week-numbers-color`         | `--mat-sys-on-surface-variant` |
| `--dc-week-numbers-header-color`  | datepicker header token        |
| `--dc-week-numbers-divider-color` | `--mat-sys-outline-variant`    |

### Custom header

The directive takes over the calendar's header slot. A custom header is therefore passed
**to the directive**, instead of `[calendarHeaderComponent]` / `[headerComponent]`:

```html
<mat-datepicker [dcWeekNumbers]="MyHeader" />
<mat-date-range-picker [dcWeekNumbers]="MyHeader" />
<mat-calendar [dcWeekNumbers]="MyHeader" />
```

`MyHeader` is written exactly like a regular `calendarHeaderComponent`: it is rendered inside
the calendar and can inject `MatCalendar`, `DateAdapter`, etc. It can change at runtime.

- Binding `[calendarHeaderComponent]` **on top of** `dcWeekNumbers` overrides the directive's
  header: no more column. A `console.warn` reports it in dev mode.
- Alternative without the directive: add `DcWeekNumbersController` to the custom header
  (`hostDirectives: [DcWeekNumbersController]`) and bind it through `[calendarHeaderComponent]`.
  If that header is also passed to `[dcWeekNumbers]`, only one controller acts (no duplicated column).

## Accessibility

- Column header: `<th scope="col">` with a long label for screen readers.
- Each row: `<th scope="row">` "Week 45", announced together with the days of the row.
- Material keyboard navigation is unaffected (it relies on `data-mat-row/col`).
- RTL: the column follows the text direction (logical CSS properties).

## Limitations — worth knowing

Material exposes **no API** for this feature. This secondary entry point:

- relies on the **internal DOM** of `mat-month-view` (`.mat-calendar-table`, `data-mat-row`,
  `thead` structure);
- overrides the inline padding of the cells with `!important` (to keep square day cells),
  limited to tables that carry the column.

This is a deliberate, isolated exception to the library's "public APIs only" rule:
**run `week-numbers.spec.ts` again on every Material upgrade.**
If the entry point lives outside `src/`, include it in the tests:
`ng test ng-deco --include='../week-numbers/**/*.spec.ts'` (or through the builder's `include`).
