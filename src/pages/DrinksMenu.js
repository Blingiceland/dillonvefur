import React, { useEffect, useState, useMemo } from 'react';
import { fetchMenuData, groupBy } from '../utils/fetchMenu';

const CATEGORY_ORDER = [
    'Draft beers', 'Bottled Beer', 'Seltzers & Ciders',
    'Cocktail', 'Coktails',
    'Gin', 'Vodka', 'Tequila', 'Rum',
    'Wine',
    'Liquor', 'Shots',
    'soft drink', 'mixer',
    'Coffee',
    'snack',
];

const CATEGORY_ICONS = {
    'Draft beers': '🍺',
    'Bottled Beer': '🍺',
    'Seltzers & Ciders': '🥂',
    'Cocktail': '🍹',
    'Coktails': '🍹',
    'Gin': '🌿',
    'Vodka': '🧊',
    'Tequila': '🌵',
    'Rum': '🏝️',
    'Wine': '🍷',
    'Liquor': '🥃',
    'Shots': '🥃',
    'soft drink': '🥤',
    'mixer': '🧉',
    'Coffee': '☕',
    'snack': '🍟',
};

const DISPLAY_NAMES = {
    'soft drink': 'Soft Drinks',
    'mixer': 'Mixers',
    'snack': 'Snacks',
    'Coktails': 'Cocktails',
};

const DrinksMenu = () => {
    const [drinks, setDrinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState('All');

    useEffect(() => {
        fetchMenuData().then(({ drinks }) => {
            setDrinks(drinks);
            setLoading(false);
        });
    }, []);

    const grouped = useMemo(() => {
        const g = groupBy(drinks, 'category');
        return Object.entries(g).sort(([a], [b]) => {
            const ia = CATEGORY_ORDER.indexOf(a);
            const ib = CATEGORY_ORDER.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });
    }, [drinks]);

    const categories = useMemo(() => ['All', ...grouped.map(([cat]) => cat)], [grouped]);

    const visibleGroups = useMemo(() => {
        if (activeCategory === 'All') return grouped;
        return grouped.filter(([cat]) => cat === activeCategory);
    }, [grouped, activeCategory]);

    const formatPrice = (p) => p.toLocaleString('is-IS') + ' kr.';

    const displayName = (cat) => DISPLAY_NAMES[cat] || cat;

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', paddingBottom: '80px' }}>
            {/* Header */}
            <div style={{
                textAlign: 'center',
                padding: '60px 20px 40px',
                borderBottom: '1px solid #1a1a1a',
            }}>
                <p style={{ color: '#c89b3c', letterSpacing: '6px', fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>
                    Bar Menu
                </p>
                <h1 style={{
                    fontFamily: 'var(--font-heading)',
                    color: '#f0e6cc',
                    fontSize: 'clamp(28px, 5vw, 52px)',
                    margin: '0 0 8px',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                }}>
                    Drinks Menu
                </h1>
                <div style={{ width: '60px', height: '2px', background: '#c89b3c', margin: '16px auto 32px' }} />

                {/* Category tabs */}
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    maxWidth: '800px',
                    margin: '0 auto',
                }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '8px 18px',
                                background: activeCategory === cat ? '#c89b3c' : 'transparent',
                                border: '1px solid ' + (activeCategory === cat ? '#c89b3c' : '#2a2a2a'),
                                borderRadius: '30px',
                                color: activeCategory === cat ? '#0a0a0a' : '#777',
                                fontFamily: 'var(--font-heading)',
                                fontSize: '11px',
                                letterSpacing: '2px',
                                textTransform: 'uppercase',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {cat === 'All' ? 'All' : displayName(cat)}
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

                {visibleGroups.map(([category, items]) => (
                    <div key={category} style={{ marginBottom: '48px' }}>
                        {/* Category header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            marginBottom: '16px',
                        }}>
                            <span style={{ fontSize: '20px' }}>{CATEGORY_ICONS[category] || '🥃'}</span>
                            <h2 style={{
                                fontFamily: 'var(--font-heading)',
                                color: '#c89b3c',
                                fontSize: '13px',
                                letterSpacing: '4px',
                                textTransform: 'uppercase',
                                margin: 0,
                                whiteSpace: 'nowrap',
                            }}>
                                {displayName(category)}
                            </h2>
                            <div style={{ flex: 1, height: '1px', background: '#1e1e1e' }} />
                        </div>

                        {/* Items */}
                        {items.map((item, idx) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 8px',
                                    borderBottom: '1px solid #111',
                                    transition: 'background 0.15s',
                                    borderRadius: '4px',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = '#0f0f0f'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                                <span style={{
                                    color: '#e8dcc8',
                                    fontSize: '15px',
                                    flex: 1,
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
        </div>
    );
};

export default DrinksMenu;
