import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  CalendarHost,
  chips,
  flush,
  FR_LABELS,
  setupCalendar,
} from './testing/week-numbers-testing';
import {
  DC_WEEK_NUMBERS_INTL,
  DC_WEEK_NUMBERS_INTL_EN,
  provideDcWeekNumbersIntl,
} from './week-numbers-intl';

const caption = (root: ParentNode) =>
  root.querySelector('.dc-week-numbers-ruler__caption')!.textContent;
const groupName = (root: ParentNode) =>
  root.querySelector('.dc-week-numbers-ruler__group')!.getAttribute('aria-label');

describe('DC_WEEK_NUMBERS_INTL / provideDcWeekNumbersIntl', () => {
  afterEach(() => vi.restoreAllMocks());

  it('defaults to English', () => {
    expect(TestBed.inject(DC_WEEK_NUMBERS_INTL)()).toBe(DC_WEEK_NUMBERS_INTL_EN);
    expect(DC_WEEK_NUMBERS_INTL_EN.formatWeekLabel(46, '9 – 15')).toBe('Week 46, 9 – 15');
  });

  it('renders the provided labels', async () => {
    const { fixture, root } = setupCalendar(CalendarHost); // French labels
    await flush(fixture);
    expect(caption(root)).toBe('Sem.');
    expect(groupName(root)).toBe('Numéros de semaine');
    expect(chips(root)[2].getAttribute('aria-label')).toBe('Semaine 46, 9 – 15');
  });

  it('labels can be translated at runtime', async () => {
    const intl = signal(FR_LABELS);
    const { fixture, root } = setupCalendar(CalendarHost, {
      providers: [provideDcWeekNumbersIntl(intl)],
    });
    await flush(fixture);
    intl.set({
      weekNumbers: 'Week numbers',
      week: 'Wk',
      formatWeekLabel: (week, days) => `Week ${week} (${days})`,
    });
    await flush(fixture);
    expect(caption(root)).toBe('Wk');
    expect(groupName(root)).toBe('Week numbers');
    expect(chips(root)[1].getAttribute('aria-label')).toBe('Week 45 (2 – 8)');
  });
});
