import { ensureOptionalColumns, parseRows, findTarget, sheetDateText, sheetDateSerial, sheetTimeFraction, dateTimeCellsRequest, entryText, colLetter, buildRowValues } from './sheetRows';

const HEADER = ['', 'Start time', 'Band', 'Contact ', 'Hver Bókar', 'Genre ', 'Private', 'Viskískóli ', '', '', ''];

describe('ensureOptionalColumns', () => {
    test('adds Poster, Tickets, Entry after column H when missing', () => {
        const r = ensureOptionalColumns(HEADER);
        expect(r.changed).toBe(true);
        expect(r.cols).toEqual({ poster: 8, tickets: 9, entry: 10 });
        expect(r.header.slice(8, 11)).toEqual(['Poster', 'Tickets', 'Entry']);
    });
    test('finds existing headers wherever they are and adds only the missing ones', () => {
        const h = [...HEADER.slice(0, 8), 'Notes', 'Entry', 'Poster'];
        const r = ensureOptionalColumns(h);
        expect(r.cols).toEqual({ poster: 10, tickets: 11, entry: 9 });
        expect(r.header[11]).toBe('Tickets');
        expect(r.changed).toBe(true);
    });
    test('does nothing when all three exist', () => {
        const h = [...HEADER.slice(0, 8), 'Poster', 'Tickets', 'Entry'];
        expect(ensureOptionalColumns(h).changed).toBe(false);
    });
});

describe('parseRows / findTarget', () => {
    const rows = [
        HEADER,
        ['Thursday 1 January', '', ''],
        ['Friday 2 January', '', 'Uppreisn'],
        ['Saturday 3 January', '', '\n'],
        ['Wednesday 7 January', '', ''],
        ['Thursday 8 January', '21:00', 'Blues'],
        ['', '', 'Three for Silver'],
        ['Friday 1 January', '', 'Spill over from next year'],
    ];
    const parsed = parseRows(rows, 2026);

    test('parses dates, blank detection and ignores undated or wrong-year rows', () => {
        expect(parsed.map((r) => [r.rowNumber, r.iso, r.bandBlank])).toEqual([
            [2, '2026-01-01', true],
            [3, '2026-01-02', false],
            [4, '2026-01-03', true],
            [5, '2026-01-07', true],
            [6, '2026-01-08', false],
        ]);
    });
    test('updates an existing empty row for that date', () => {
        expect(findTarget(parsed, '2026-01-03', 'New Band')).toEqual({ mode: 'update', rowNumber: 4 });
    });
    test('reports a taken date, unless it is the same band (retry)', () => {
        expect(findTarget(parsed, '2026-01-02', 'New Band')).toEqual({ mode: 'taken', rowNumber: 3, band: 'Uppreisn' });
        expect(findTarget(parsed, '2026-01-02', 'uppreisn')).toEqual({ mode: 'update', rowNumber: 3 });
    });
    test('inserts before the first later date, keeping chronological order', () => {
        expect(findTarget(parsed, '2026-01-04', 'X')).toEqual({ mode: 'insert', rowNumber: 5 });
        expect(findTarget(parsed, '2026-01-06', 'X')).toEqual({ mode: 'insert', rowNumber: 5 });
    });
    test('inserts after the last dated row when the date is later than everything, above spill-over rows', () => {
        expect(findTarget(parsed, '2026-03-01', 'X')).toEqual({ mode: 'insert', rowNumber: 7 });
    });
    test('inserts at the top when the date is earlier than everything', () => {
        expect(findTarget(parsed.filter((r) => r.iso > '2026-01-05'), '2026-01-01', 'X')).toEqual({ mode: 'insert', rowNumber: 5 });
    });
});

describe('formatting helpers', () => {
    test('sheetDateText matches the sheet convention', () => {
        expect(sheetDateText('2026-03-22')).toBe('Sunday 22 March');
        expect(sheetDateText('2027-01-01')).toBe('Friday 1 January');
    });
    test('entryText uses dot thousands separators', () => {
        expect(entryText({ entry_type: 'free' })).toBe('Free');
        expect(entryText({ entry_type: 'ticketed', ticket_price_isk: 2500 })).toBe('2.500 kr.');
        expect(entryText({ entry_type: 'ticketed', ticket_price_isk: 12000 })).toBe('12.000 kr.');
    });
    test('colLetter', () => {
        expect(colLetter(0)).toBe('A');
        expect(colLetter(8)).toBe('I');
        expect(colLetter(26)).toBe('AA');
    });
    test('buildRowValues writes C–F plus the optional cells', () => {
        const v = buildRowValues({ band: 'Nöp', contact: 'x – y – z', genre: 'Pönk', posterUrl: 'https://p', ticketUrl: '', entry: 'Free' }, { poster: 8, tickets: 9, entry: 10 });
        expect(v.main).toEqual(['Nöp', 'x – y – z', 'web', 'Pönk']);
        expect(v.optional).toEqual([[8, 'https://p'], [9, ''], [10, 'Free']]);
    });
    test('sheetDateSerial matches the serials Google stores', () => {
        expect(sheetDateSerial('2026-11-27')).toBe(46353); // read from the real sheet
        expect(sheetDateSerial('2026-11-28')).toBe(46354);
        expect(sheetDateSerial('2027-01-01')).toBe(46388);
    });
    test('sheetTimeFraction converts HH:mm to a fraction of a day', () => {
        expect(sheetTimeFraction('21:00')).toBe(0.875);
        expect(sheetTimeFraction('20:30')).toBeCloseTo(0.854166, 5);
        expect(sheetTimeFraction('')).toBeNull();
        expect(sheetTimeFraction('late')).toBeNull();
    });
    test('dateTimeCellsRequest writes typed date and time cells with the tab formats', () => {
        const req = dateTimeCellsRequest({ sheetId: 7, rowNumber: 201, isoDate: '2026-11-28', time: '21:00' });
        expect(req.updateCells.start).toEqual({ sheetId: 7, rowIndex: 200, columnIndex: 0 });
        const [a, b] = req.updateCells.rows[0].values;
        expect(a.userEnteredValue).toEqual({ numberValue: 46354 });
        expect(a.userEnteredFormat.numberFormat.pattern).toBe('dddd d mmmm');
        expect(b.userEnteredValue).toEqual({ numberValue: 0.875 });
        expect(b.userEnteredFormat.numberFormat.type).toBe('TIME');
    });
});
