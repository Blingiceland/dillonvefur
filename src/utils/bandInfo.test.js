import { publicBandInfo } from './bandInfo';

const BASE = 'https://x.supabase.co/storage/v1/object/public/band-media';

const row = () => ({
    band_name: ' Nöp ', genre: 'Punk', based_in: 'Reykjavík', bio: 'Loud.', line_up: 'Four', previous_gigs: '',
    tech_needs: 'two DI boxes', audience_estimate: '30_60', contact_name: 'Jón', contact_email: 'j@x.is', contact_phone: '123',
    spotify_url: 'https://open.spotify.com/artist/abc', youtube_url: '', instagram_url: 'http://instagram.com/nop', website_url: null,
    press_photo_path: 'applications/1/press-photo.jpg', poster_path: null,
});

describe('publicBandInfo', () => {
    test('keeps only the public fields and builds media URLs', () => {
        const info = publicBandInfo(row(), BASE);
        expect(info).toEqual({
            band_name: 'Nöp', genre: 'Punk', based_in: 'Reykjavík', bio: 'Loud.', line_up: 'Four', previous_gigs: null,
            press_photo: `${BASE}/applications/1/press-photo.jpg`, poster: null,
            links: { spotify: 'https://open.spotify.com/artist/abc' },
        });
        expect(JSON.stringify(info)).not.toMatch(/j@x\.is|123|DI boxes|30_60|Jón/);
    });
    test('drops non-https links and returns null for no row', () => {
        expect(publicBandInfo(row(), BASE).links.instagram).toBeUndefined();
        expect(publicBandInfo(null, BASE)).toBeNull();
    });
});
