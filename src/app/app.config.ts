import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  signal,
  Signal,
} from '@angular/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { enUS } from 'date-fns/locale';
import { DC_WEEK_NUMBERS_INTL, DcWeekNumbersIntl } from 'week-numbers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideDateFnsAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: enUS },
    {
      provide: DC_WEEK_NUMBERS_INTL,
      useValue: signal({
        week: 'Week',
        weekNumbers: 'Week numbers',
        formatWeekLabel: (week, days) => `Week ${week}, ${days}`,
      }) satisfies Signal<DcWeekNumbersIntl>,
    },
  ],
};
