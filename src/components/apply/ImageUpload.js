import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { labelStyle, hintStyle, errorStyle } from '../formStyles';

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * Picks an image, asks the API for a signed upload slot, uploads straight to Supabase Storage
 * and reports the storage path back through onChange(path | '').
 */
const ImageUpload = ({ kind, label, hint, required, value, onChange, error, existingUrl = null }) => {
    const inputRef = useRef(null);
    const [preview, setPreview] = useState(existingUrl);
    const [busy, setBusy] = useState(false);
    const [localError, setLocalError] = useState(null);

    useEffect(() => () => { if (preview && preview.startsWith('blob:')) URL.revokeObjectURL(preview); }, [preview]);

    const pick = async (file) => {
        setLocalError(null);
        if (!file) return;
        if (!ACCEPT.includes(file.type)) { setLocalError('Use a JPG, PNG or WebP image'); return; }
        if (file.size > MAX_BYTES) { setLocalError('Images must be under 8 MB'); return; }
        if (!supabase) { setLocalError('Uploads are not available right now'); return; }

        setBusy(true);
        try {
            const res = await fetch('/api/apply/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, contentType: file.type, size: file.size }),
            });
            const slot = await res.json();
            if (!res.ok) throw new Error(slot.error || 'Upload failed');
            const { error: upErr } = await supabase.storage.from('band-media').uploadToSignedUrl(slot.path, slot.token, file, { contentType: file.type });
            if (upErr) throw upErr;
            setPreview(URL.createObjectURL(file));
            onChange(slot.path);
        } catch (e) {
            setLocalError(e.message || 'Upload failed, please try again');
            onChange('');
        } finally {
            setBusy(false);
        }
    };

    const clear = () => {
        onChange('');
        setPreview(null);
        if (inputRef.current) inputRef.current.value = '';
    };

    const id = `upload-${kind}`;
    const shown = error || localError;

    return (
        <div>
            <label htmlFor={id} style={labelStyle}>{label}{required ? '' : ' (optional)'}</label>
            <div
                style={{ border: `1px dashed ${shown ? '#b04a4a' : '#444'}`, background: '#111', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
            >
                {preview && <img src={preview} alt="" style={{ width: '120px', height: '90px', objectFit: 'cover', border: '1px solid #333' }} />}
                <div style={{ flex: 1, minWidth: '200px' }}>
                    <input
                        ref={inputRef}
                        id={id}
                        type="file"
                        accept={ACCEPT.join(',')}
                        onChange={(e) => pick(e.target.files?.[0])}
                        disabled={busy}
                        style={{ color: '#ccc', fontSize: '14px' }}
                    />
                    <p style={hintStyle}>{busy ? 'Uploading…' : value ? (value.startsWith('incoming/') ? 'Uploaded' : 'Current photo kept. Choose a file to replace it.') : hint}</p>
                </div>
                {value && !busy && (
                    <button type="button" onClick={clear} className="btn btn-outline" style={{ padding: '8px 14px', fontSize: '12px' }}>Remove</button>
                )}
            </div>
            {shown && <p style={errorStyle}>{shown}</p>}
        </div>
    );
};

export default ImageUpload;
