import { parseMenuCSV } from './fetchMenu';

const HEADER = 'Vörunúmer,Vöruheiti,Vöruflokkur,Söluverð m/VSK (kr.),VSK %,Sölueining / skammtur,Birgir,Innkaupsverð án VSK (kr.),Land,Undirflokkur,Athugasemdir';

const csv = (rows) => [HEADER, ...rows].join('\n');

describe('parseMenuCSV', () => {
    test('parses whisky rows with name, price, country and subcategory', () => {
        const { whiskies } = parseMenuCSV(csv([
            'WHI002,Aberfeldy 12,Whiský,"2,100.00",11.0%,30 ml,Ölgerðin,,Scotland,Highland,',
        ]));
        expect(whiskies).toEqual([
            { name: 'Aberfeldy 12', price: 2100, country: 'Scotland', category: 'Highland' },
        ]);
    });

    test('parses non-whisky rows into drinks with name, category and price', () => {
        const { drinks } = parseMenuCSV(csv([
            'BLD001,Aperol Spritz,Blandaðir drykkir,"3,250.00",11.0%,,,,,,',
            'GOS002,Cola bottle/glass,Gos og vatn,700.00,11.0%,,,,,,',
        ]));
        expect(drinks).toEqual([
            { name: 'Aperol Spritz', category: 'Blandaðir drykkir', price: 3250 },
            { name: 'Cola bottle/glass', category: 'Gos og vatn', price: 700 },
        ]);
    });

    test('whiskies are not in drinks and merchandise is excluded from both', () => {
        const { whiskies, drinks } = parseMenuCSV(csv([
            'WHI001,Abasolo,Whiský,"2,000.00",11.0%,30 ml,Masters,,International,Mexican,',
            'VAR003,Dillon T shirt,Söluvarningur,"6,990.00",11.0%,,,,,,Söluverð vantar.',
        ]));
        expect(whiskies).toHaveLength(1);
        expect(drinks).toHaveLength(0);
    });

    test('skips blank rows and rows without a name or price', () => {
        const { whiskies, drinks } = parseMenuCSV(csv([
            '',
            'WHI999,,Whiský,"2,000.00",11.0%,,,,Scotland,Islay,',
            'GOS999,Nameless price,Gos og vatn,,11.0%,,,,,,',
            '   ',
        ]));
        expect(whiskies).toHaveLength(0);
        expect(drinks).toHaveLength(0);
    });

    test('handles quoted fields containing commas and newlines, and CRLF line endings', () => {
        const text = HEADER + '\r\n' +
            'WHI010,"Balvenie, 21",Whiský,"7,900.00",11.0%,30 ml,CCEP,,Scotland,Speyside,"multi\nline note"\r\n' +
            'GIN001,Askur Gin,Gin,"1,600.00",11.0%,,,,,,\r\n';
        const { whiskies, drinks } = parseMenuCSV(text);
        expect(whiskies).toEqual([
            { name: 'Balvenie, 21', price: 7900, country: 'Scotland', category: 'Speyside' },
        ]);
        expect(drinks).toEqual([{ name: 'Askur Gin', category: 'Gin', price: 1600 }]);
    });

    test('keeps whisky rows with unknown subcategory and no country as empty strings', () => {
        const { whiskies } = parseMenuCSV(csv([
            'HAP006,Whiský – Happy hour,Whiský,"1,350.00",11.0%,30 ml,,,,,',
        ]));
        expect(whiskies).toEqual([
            { name: 'Whiský – Happy hour', price: 1350, country: '', category: '' },
        ]);
    });
});

describe('data clean-up', () => {
    test('infers country from subcategory when Land is empty', () => {
        const { whiskies } = parseMenuCSV(csv([
            'WHI053,Fuji,Whiský,"3,900.00",11.0%,30 ml,,,,Japanese,',
            'WHI002,Aberfeldy 12,Whiský,"2,100.00",11.0%,30 ml,,,,Highland,',
        ]));
        expect(whiskies.map(w => w.country)).toEqual(['International', 'Scotland']);
    });

    test('removes duplicate drink rows with the same name, category and price', () => {
        const { drinks } = parseMenuCSV(csv([
            'KRA001,Bóndi 400 ml,Kranabjór,"1,900.00",11.0%,400 ml,,,,,',
            'KRA002,Bóndi 400 ml,Kranabjór,"1,900.00",11.0%,400 ml,,,,,',
            'KRA003,Einstök Pale Ale 400 ml,Kranabjór,"1,900.00",11.0%,400 ml,,,,,',
        ]));
        expect(drinks.map(d => d.name)).toEqual(['Bóndi 400 ml', 'Einstök Pale Ale 400 ml']);
    });
});
