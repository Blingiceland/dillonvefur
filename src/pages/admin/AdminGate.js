import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { field, labelStyle, errorStyle, hintStyle } from '../../components/formStyles';

export const ADMIN_EMAIL = 'dillon@dillon.is';

const Box = ({ children }) => (
    <div style={{ minHeight: '60vh', padding: '60px 20px' }}>
        <div style={{ maxWidth: '440px', margin: '0 auto', border: '1px solid var(--color-gold)', background: 'rgba(20,20,20,0.8)', padding: '36px' }}>{children}</div>
    </div>
);

/**
 * Sign-in gate for the owner: email + password, with an emailed sign-in link as fallback.
 * Renders children({ session }) once signed in as ADMIN_EMAIL.
 */
const AdminGate = ({ children }) => {
    const [session, setSession] = useState(undefined); // undefined = checking
    const [email, setEmail] = useState(ADMIN_EMAIL);
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState('password'); // 'password' | 'link'
    const [sent, setSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const meta = document.createElement('meta');
        meta.name = 'robots';
        meta.content = 'noindex, nofollow';
        document.head.appendChild(meta);
        return () => meta.remove();
    }, []);

    useEffect(() => {
        if (!supabase) { setSession(null); return undefined; }
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
        return () => sub.subscription.unsubscribe();
    }, []);

    const signIn = async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
            if (mode === 'password') {
                const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
                if (err) setError(err.message === 'Invalid login credentials' ? 'Wrong email or password.' : err.message);
            } else {
                const { error: err } = await supabase.auth.signInWithOtp({
                    email: email.trim(),
                    options: { emailRedirectTo: `${window.location.origin}/admin`, shouldCreateUser: false },
                });
                if (err) setError(err.message);
                else setSent(true);
            }
        } finally {
            setBusy(false);
        }
    };

    if (!supabase) return <Box><p style={errorStyle}>Admin is not configured (missing Supabase keys).</p></Box>;
    if (session === undefined) return <Box><p className="text-gold" style={{ letterSpacing: '3px' }}>CHECKING…</p></Box>;

    if (session && session.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
        return (
            <Box>
                <p style={errorStyle}>{session.user.email} is not allowed here.</p>
                <button type="button" className="btn btn-outline" onClick={() => supabase.auth.signOut()} style={{ marginTop: '16px' }}>Sign out</button>
            </Box>
        );
    }

    if (!session) {
        return (
            <Box>
                <p style={{ color: '#c89b3c', letterSpacing: '4px', fontSize: '12px', textTransform: 'uppercase', margin: '0 0 8px' }}>Dillon staff</p>
                <h1 style={{ fontFamily: 'var(--font-heading)', color: '#f0e6cc', fontSize: '32px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 20px' }}>Sign in</h1>
                {sent ? (
                    <p style={{ color: '#ccc', lineHeight: 1.6 }}>Check your inbox. The sign-in link works once and expires in an hour.</p>
                ) : (
                    <form onSubmit={signIn} style={{ display: 'grid', gap: '14px' }}>
                        <div>
                            <label htmlFor="admin-email" style={labelStyle}>Email</label>
                            <input id="admin-email" type="email" required autoComplete="username" spellCheck="false" value={email} onChange={(e) => setEmail(e.target.value)} style={field} />
                        </div>
                        {mode === 'password' && (
                            <div>
                                <label htmlFor="admin-password" style={labelStyle}>Password</label>
                                <input id="admin-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={field} />
                            </div>
                        )}
                        {error && <p style={errorStyle}>{error}</p>}
                        <button type="submit" className="btn btn-primary" disabled={busy}>
                            {busy ? 'Signing in…' : mode === 'password' ? 'Sign In' : 'Email Me a Sign-in Link'}
                        </button>
                        <p style={hintStyle}>
                            {mode === 'password' ? (
                                <>Forgot the password? <button type="button" onClick={() => { setMode('link'); setError(null); }} style={{ background: 'none', border: 'none', color: '#c89b3c', cursor: 'pointer', padding: 0, font: 'inherit' }}>Email me a sign-in link</button></>
                            ) : (
                                <button type="button" onClick={() => { setMode('password'); setError(null); }} style={{ background: 'none', border: 'none', color: '#c89b3c', cursor: 'pointer', padding: 0, font: 'inherit' }}>Use a password instead</button>
                            )}
                        </p>
                    </form>
                )}
            </Box>
        );
    }

    return children({ session });
};

export default AdminGate;
