import { ApplicationConfig, provideBrowserGlobalErrorListeners, signal } from '@angular/core';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { enUS } from 'date-fns/locale';
import { provideDcWeekNumbersIntl } from 'week-numbers';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideDateFnsAdapter(),
    { provide: MAT_DATE_LOCALE, useValue: enUS },
    provideDcWeekNumbersIntl(
      signal({
        weekNumbers: 'Week numbers',
        week: 'Week',
        formatWeekLabel: (week, dayRange) => `Week ${week}, ${dayRange}`,
      }),
    ),
  ],
};
