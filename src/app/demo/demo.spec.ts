import { signal, Signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideDateFnsAdapter } from '@angular/material-date-fns-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { enUS } from 'date-fns/locale';
import { DC_WEEK_NUMBERS_INTL, DcWeekNumbersIntl } from 'week-numbers';
import { Demo } from './demo';

describe('Demo', () => {
  let component: Demo;
  let fixture: ComponentFixture<Demo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Demo],
      providers: [
        provideDateFnsAdapter(),
        { provide: MAT_DATE_LOCALE, useValue: enUS },
        {
          provide: DC_WEEK_NUMBERS_INTL,
          useValue: signal({
            week: 'Week',
            weekNumbers: 'Week numbers',
            formatWeekLabel: (week, dayRange) => `Week ${week}, ${dayRange}`,
          }) satisfies Signal<DcWeekNumbersIntl>,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Demo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
