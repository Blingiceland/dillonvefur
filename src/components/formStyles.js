// Shared form styling for the dark/gold theme (Book Dillon, Play at Dillon, admin).
export const field = {
    width: '100%',
    padding: '12px 14px',
    background: '#111',
    border: '1px solid #333',
    color: '#f0e6cc',
    fontSize: '16px',
    fontFamily: 'var(--font-body)',
    boxSizing: 'border-box',
};

export const fieldError = { ...field, borderColor: '#b04a4a' };

export const labelStyle = {
    display: 'block',
    color: '#c89b3c',
    fontSize: '12px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    marginBottom: '6px',
};

export const hintStyle = { color: '#777', fontSize: '13px', margin: '6px 0 0' };
export const errorStyle = { color: '#e07b7b', fontSize: '13px', margin: '6px 0 0' };
export const sectionLabel = { color: '#c89b3c', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 10px' };
