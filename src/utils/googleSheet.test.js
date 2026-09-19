import { parseEventsCSV, slugify, directImageUrl } from './googleSheet';

const HEADER = '"","Start time","Band","Contact ","Hver Bókar","Genre ","Private","Viskískóli "';
const csv = (rows, header = HEADER) => [header, ...rows].join('\n');

describe('parseEventsCSV', () => {
    test('parses date, time and band for the given year', () => {
        const events = parseEventsCSV(csv([
            '"Thursday 19 March","21:00","Blues: Beggi Smari","","","","",""',
        ]), 2026);
        expect(events).toHaveLength(1);
        const e = events[0];
        expect(e.title).toBe('Blues: Beggi Smari');
        expect(e.time).toBe('21:00');
        expect(e.dateObj.getFullYear()).toBe(2026);
        expect(e.dateObj.getMonth()).toBe(2);
        expect(e.dateObj.getDate()).toBe(19);
        expect(e.dayNum).toBe(19);
        expect(e.isoDate).toBe('2026-03-19');
        expect(e.slug).toBe('2026-03-19-blues-beggi-smari');
        expect(e.genre).toBe('');
        expect(e.poster).toBe('');
        expect(e.tickets).toBe('');
        expect(e.entry).toBe('');
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

    test('reads optional Poster, Tickets and Entry columns by header name', () => {
        const header = HEADER + ',"Poster","Tickets","Entry"';
        const events = parseEventsCSV(csv([
            '"Saturday 12 September","","Nöp","","","Pönk","","","https://drive.google.com/file/d/ABC123/view?usp=sharing","https://tix.is/nop","Free"',
            '"Thursday 17 September","","Blues: Beggi Smari","","","","","","","",""',
        ], header), 2026);
        expect(events[0].poster).toBe('https://drive.google.com/uc?export=view&id=ABC123');
        expect(events[0].tickets).toBe('https://tix.is/nop');
        expect(events[0].entry).toBe('Free');
        expect(events[1].poster).toBe('');
        expect(events[1].entry).toBe('');
    });
});

describe('slugify', () => {
    test('handles Icelandic letters and punctuation', () => {
        expect(slugify('Dánarfregnir með Mannveiru, Óreiða og Methlehem')).toBe('danarfregnir-med-mannveiru-oreida-og-methlehem');
        expect(slugify('Þögn Útgáfutónleikar')).toBe('thogn-utgafutonleikar');
        expect(slugify('Ballados & "co"')).toBe('ballados-co');
    });
});

describe('directImageUrl', () => {
    test('converts Google Drive share links and leaves others alone', () => {
        expect(directImageUrl('https://drive.google.com/open?id=XYZ')).toBe('https://drive.google.com/uc?export=view&id=XYZ');
        expect(directImageUrl('https://example.com/poster.jpg')).toBe('https://example.com/poster.jpg');
    });
});

describe('parseSheetDate', () => {
    const { parseSheetDate } = require('./googleSheet');
    test('returns ISO date when the weekday matches the year', () => {
        expect(parseSheetDate('Thursday 19 March', 2026)).toBe('2026-03-19');
        expect(parseSheetDate('  Sunday   22 march ', 2026)).toBe('2026-03-22');
    });
    test('returns null for mismatching weekday, bad month or blank', () => {
        expect(parseSheetDate('Thursday 1 January', 2027)).toBeNull();
        expect(parseSheetDate('Friday 1 Foo', 2026)).toBeNull();
        expect(parseSheetDate('', 2026)).toBeNull();
        expect(parseSheetDate('Band', 2026)).toBeNull();
    });
});

describe('analyzeSheet', () => {
    const { analyzeSheet } = require('./googleSheet');
    const HEADER2 = '"","Start time","Band","Contact ","Hver Bókar","Genre ","Private","Viskískóli "';
    const rows = [
        '"Thursday 1 January","","","","","","",""',
        '"Friday 2 January","","Uppreisn","","","","",""',
        '"Saturday 3 January","","Private Party","","","","Private",""',
        '"Wednesday 7 January","","\n","","","","",""',
        '"Thursday 8 January","","Some Band CANCELLED","","","","",""',
        '"Friday 1 January","","Spill over","","","","",""',
    ];
    test('marks dates with a band as taken, including private, excluding cancelled and whitespace-only', () => {
        const r = analyzeSheet([HEADER2, ...rows].join('\n'), 2026);
        expect(r.exists).toBe(true);
        expect(r.taken).toEqual(['2026-01-02', '2026-01-03']);
    });
    test('reports a missing tab when Google returns another year (weekdays do not match)', () => {
        const r = analyzeSheet([HEADER2, ...rows].join('\n'), 2027);
        expect(r.exists).toBe(false);
        expect(r.taken).toEqual([]);
    });
});
