import React, { useEffect, useState, useMemo } from 'react';
import { fetchMenuData, groupBy } from '../utils/fetchMenu';
import { usePageMeta } from '../utils/seo';

// Preferred tab order; any other country found in the sheet is appended after these.
const REGION_ORDER = ['Scotland', 'USA', 'Ireland', 'International'];

const CATEGORY_ORDER = {
    // Scotland
    'Speyside': 1, 'Highland': 2, 'Islay': 3, 'Islands': 4, 'Lowland': 5,
    'Blended Scotch': 6, 'Scotch': 7,
    // USA
    'Bourbon': 10, 'Rye': 11, 'Tenessee Whiskey': 12, 'American whiskey': 13,
    // Ireland
    'Single Malt': 20, 'Blended': 21, 'Green Spot': 22,
    // International
    'Japanese': 30, 'Mexican': 31, 'Canadian': 32, 'French': 33,
    'Taiwan': 34, 'Finland': 35, 'Finnish': 35, 'Welsh': 36,
    'Faroe Island': 37, 'Spain': 38,
};

const WhiskyList = () => {
    usePageMeta({
        title: 'Whisky List',
        path: '/whisky',
        description: 'The full whisky list at Dillon Whiskey Bar, Reykjavík: Scotch, bourbon, rye, Irish and Japanese whiskies by region, with prices per 30 ml.',
    });
    const [whiskies, setWhiskies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeRegion, setActiveRegion] = useState('All');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchMenuData().then(({ whiskies }) => {
            setWhiskies(whiskies);
            setLoading(false);
        });
    }, []);

    const regions = useMemo(() => {
        const present = new Set(whiskies.map(w => w.country).filter(Boolean));
        const ordered = REGION_ORDER.filter(r => present.has(r));
        const extra = [...present].filter(r => !REGION_ORDER.includes(r)).sort();
        return ['All', ...ordered, ...extra];
    }, [whiskies]);

    const filtered = useMemo(() => {
        let items = whiskies;
        if (activeRegion !== 'All') {
            items = items.filter(w => w.country === activeRegion);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            items = items.filter(w =>
                w.name.toLowerCase().includes(q) ||
                w.category.toLowerCase().includes(q)
            );
        }
        return items;
    }, [whiskies, activeRegion, search]);

    const groupByCategory = (items) =>
        Object.entries(groupBy(items, 'category')).sort(([a], [b]) => {
            return (CATEGORY_ORDER[a] || 99) - (CATEGORY_ORDER[b] || 99);
        });

    const regionRank = (r) => {
        if (!r || r === 'Other') return 999;
        const i = REGION_ORDER.indexOf(r);
        return i === -1 ? 500 : i;
    };

    // In the "All" view, group by country first with a country heading above its subcategories.
    // When a single region is selected, show only the subcategory sections.
    const sections = useMemo(() => {
        if (activeRegion !== 'All') {
            return [{ country: null, groups: groupByCategory(filtered) }];
        }
        return Object.entries(groupBy(filtered, 'country'))
            .sort(([a], [b]) => regionRank(a) - regionRank(b) || a.localeCompare(b))
            .map(([country, items]) => ({ country, groups: groupByCategory(items), count: items.length }));
    }, [filtered, activeRegion]);

    const formatPrice = (p) => p.toLocaleString('is-IS') + ' kr.';

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '80px' }}>
            {/* Header */}
            <div style={{
                textAlign: 'center',
                padding: '60px 20px 40px',
                borderBottom: '1px solid #1a1a1a',
            }}>
                <p style={{ color: '#c89b3c', letterSpacing: '6px', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Over 250 expressions
                </p>
                <h1 style={{
                    fontFamily: 'var(--font-heading)',
                    color: '#f0e6cc',
                    fontSize: 'clamp(28px, 5vw, 52px)',
                    margin: '0 0 8px',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                }}>
                    Whisky List
                </h1>
                <div style={{ width: '60px', height: '2px', background: '#c89b3c', margin: '16px auto 24px' }} />

                {/* Search */}
                <div style={{ maxWidth: '400px', margin: '0 auto 32px' }}>
                    <input
                        type="text"
                        placeholder="Search whisky…"
                        aria-label="Search whisky"
                        name="whisky-search"
                        autoComplete="off"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 20px',
                            background: '#111',
                            border: '1px solid #333',
                            borderRadius: '30px',
                            color: '#f0e6cc',
                            fontSize: '15px',
                            outline: 'none',
                            boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                        }}
                        onFocus={e => e.target.style.borderColor = '#c89b3c'}
                        onBlur={e => e.target.style.borderColor = '#333'}
                    />
                </div>

                {/* Region tabs */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {regions.map(region => (
                        <button
                            key={region}
                            onClick={() => setActiveRegion(region)}
                            style={{
                                padding: '8px 22px',
                                background: activeRegion === region ? '#c89b3c' : 'transparent',
                                border: '1px solid ' + (activeRegion === region ? '#c89b3c' : '#333'),
                                borderRadius: '30px',
                                color: activeRegion === region ? '#0a0a0a' : '#888',
                                fontFamily: 'var(--font-heading)',
                                fontSize: '12px',
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {region}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
                {loading && (
                    <p style={{ color: '#888', textAlign: 'center', fontSize: '14px', letterSpacing: '3px' }}>
                        LOADING...
                    </p>
                )}

                {!loading && filtered.length === 0 && (
                    <p style={{ color: '#555', textAlign: 'center', fontSize: '14px' }}>
                        No whiskies found.
                    </p>
                )}

                {sections.map(({ country, groups, count }) => (
                <div key={country || 'single'} style={{ marginBottom: country ? '64px' : 0 }}>
                    {country && (
                        <div style={{ marginBottom: '32px' }}>
                            <h2 style={{
                                fontFamily: 'var(--font-heading)',
                                color: '#f0e6cc',
                                fontSize: 'clamp(20px, 3vw, 28px)',
                                letterSpacing: '5px',
                                textTransform: 'uppercase',
                                margin: 0,
                            }}>
                                {country}
                                <span style={{ color: '#555', fontSize: '13px', letterSpacing: '2px', marginLeft: '14px' }}>
                                    {count}
                                </span>
                            </h2>
                            <div style={{ width: '40px', height: '2px', background: '#c89b3c', marginTop: '12px' }} />
                        </div>
                    )}

                {groups.map(([category, items]) => (
                    <div key={category} style={{ marginBottom: '48px' }}>
                        {/* Category header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            marginBottom: '16px',
                        }}>
                            <h3 style={{
                                fontFamily: 'var(--font-heading)',
                                color: '#c89b3c',
                                fontSize: '13px',
                                letterSpacing: '4px',
                                textTransform: 'uppercase',
                                margin: 0,
                                whiteSpace: 'nowrap',
                            }}>
                                {category}
                            </h3>
                            <div style={{ flex: 1, height: '1px', background: '#1e1e1e' }} />
                            <span style={{ color: '#444', fontSize: '12px' }}>{items.length}</span>
                        </div>

                        {/* Items */}
                        {items.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 0',
                                    borderBottom: '1px solid #111',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#0f0f0f'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{
                                    color: '#e8dcc8',
                                    fontSize: '15px',
                                    flex: 1,
                                    paddingRight: '16px',
                                }}>
                                    {item.name}
                                </span>
                                <span style={{
                                    color: '#c89b3c',
                                    fontSize: '14px',
                                    fontVariantNumeric: 'tabular-nums',
                                    whiteSpace: 'nowrap',
                                    fontFamily: 'var(--font-heading)',
                                    letterSpacing: '1px',
                                }}>
                                    {formatPrice(item.price)}
                                </span>
                            </div>
                        ))}
                    </div>
                ))}
                </div>
                ))}
            </div>
        </div>
    );
};

export default WhiskyList;
