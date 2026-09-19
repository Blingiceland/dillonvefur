import { parseEventsCSV } from './googleSheet';

const HEADER = '"","Start time","Band","Contact ","Hver Bókar","Genre ","Private","Viskískóli "';
const csv = (rows) => [HEADER, ...rows].join('\n');

describe('parseEventsCSV', () => {
    test('parses date, time and band for the given year', () => {
        const events = parseEventsCSV(csv([
            '"Thursday 19 March","21:00","Blues: Beggi Smari","","","","",""',
        ]), 2026);
        expect(events).toHaveLength(1);
        expect(events[0].title).toBe('Blues: Beggi Smari');
        expect(events[0].time).toBe('21:00');
        expect(events[0].dateObj.getFullYear()).toBe(2026);
        expect(events[0].dateObj.getMonth()).toBe(2);
        expect(events[0].dateObj.getDate()).toBe(19);
        expect(events[0].genre).toBe('');
    });

    test('defaults missing time to 21:00 and keeps genre', () => {
        const events = parseEventsCSV(csv([
            '"Friday 7 August","","Paid Extroverts","x@example.com","Oliver","Indie rock","",""',
        ]), 2026);
        expect(events[0].time).toBe('21:00');
        expect(events[0].genre).toBe('Indie rock');
    });

    test('skips cancelled, private and undated rows', () => {
        const events = parseEventsCSV(csv([
            '"Friday 31 July","","Bjarmi og Gunnþór CANCELLED","","","","",""',
            '"Saturday 8 August","","Private Party","","Jón","","Private",""',
            '"Friday 16 October","","Private Event","","","","",""',
            '"","","Three for Silver","","Katrín","","",""',
            '"Saturday 12 September","","Nöp","","Oliver","Pönk","",""',
        ]), 2026);
        expect(events.map(e => e.title)).toEqual(['Nöp']);
    });

    test('returns no events when the weekday names do not match the year (wrong sheet)', () => {
        // 1 January 2026 is a Thursday; in 2027 it is a Friday.
        const events = parseEventsCSV(csv([
            '"Thursday 1 January","","Band A","","","","",""',
            '"Friday 2 January","","Band B","","","","",""',
            '"Saturday 3 January","","Band C","","","","",""',
        ]), 2027);
        expect(events).toEqual([]);
    });

    test('does not expose contact details on events', () => {
        const events = parseEventsCSV(csv([
            '"Saturday 7 February","","Eymd","S: 7826535","","","",""',
        ]), 2026);
        expect(JSON.stringify(events[0])).not.toContain('7826535');
    });
});
