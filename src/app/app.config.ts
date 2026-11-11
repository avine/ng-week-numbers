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
import { DC_WEEK_NUMBER_INTL, DcWeekNumbersIntl } from 'week-numbers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideDateFnsAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: enUS },
    {
      provide: DC_WEEK_NUMBER_INTL,
      useValue: signal({
        shortWeek: 'Wk',
        week: 'Week numbers',
        weekNumber: (week: number, days: string) => `Week ${week}, ${days}`,
      }) satisfies Signal<DcWeekNumbersIntl>,
    },
  ],
};
