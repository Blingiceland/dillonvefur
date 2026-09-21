import { bookingWindow, addDays, isoDate, isInWindow, isWeekdayOpen, monthsInWindow } from './bookingRules';

describe('bookingRules', () => {
    const today = new Date(Date.UTC(2026, 8, 19)); // 2026-09-19

    test('isoDate formats a UTC date as YYYY-MM-DD', () => {
        expect(isoDate(today)).toBe('2026-09-19');
        expect(isoDate(new Date(Date.UTC(2027, 0, 5)))).toBe('2027-01-05');
    });

    test('addDays works across month and year boundaries', () => {
        expect(addDays('2026-12-25', 10)).toBe('2027-01-04');
        expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });

    test('bookingWindow opens 14 days ahead and closes after 180 days', () => {
        const w = bookingWindow(today);
        expect(w.from).toBe('2026-10-03');
        expect(w.to).toBe('2027-03-18');
    });

    test('isInWindow is inclusive on both ends', () => {
        const w = bookingWindow(today);
        expect(isInWindow('2026-10-03', w)).toBe(true);
        expect(isInWindow('2027-03-18', w)).toBe(true);
        expect(isInWindow('2026-10-02', w)).toBe(false);
        expect(isInWindow('2027-03-19', w)).toBe(false);
        expect(isInWindow('not-a-date', w)).toBe(false);
    });

    test('isWeekdayOpen closes Thursdays', () => {
        expect(isWeekdayOpen('2026-10-08')).toBe(false); // Thursday
        expect(isWeekdayOpen('2026-10-09')).toBe(true);  // Friday
        expect(isWeekdayOpen('2027-01-07')).toBe(false); // Thursday
        expect(isWeekdayOpen('nope')).toBe(false);
    });

    test('monthsInWindow lists every month touched by the window', () => {
        const w = bookingWindow(today);
        expect(monthsInWindow(w)).toEqual(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
    });
});
