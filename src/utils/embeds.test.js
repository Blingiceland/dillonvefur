import { embedFor } from './embeds';

describe('embedFor', () => {
    test('YouTube watch, short and shorts links become embed players', () => {
        expect(embedFor('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toEqual({ kind: 'youtube', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ratio: 16 / 9 });
        expect(embedFor('https://youtu.be/dQw4w9WgXcQ')).toEqual({ kind: 'youtube', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ratio: 16 / 9 });
        expect(embedFor('https://youtube.com/shorts/dQw4w9WgXcQ')).toEqual({ kind: 'youtube', src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', ratio: 16 / 9 });
    });
    test('Spotify artist, album, track and playlist links become embed players', () => {
        expect(embedFor('https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi?si=x')).toEqual({ kind: 'spotify', src: 'https://open.spotify.com/embed/artist/4tZwfgrHOc3mvqYlEYSvVi', height: 352 });
        expect(embedFor('https://open.spotify.com/track/abc')).toEqual({ kind: 'spotify', src: 'https://open.spotify.com/embed/track/abc', height: 152 });
    });
    test('SoundCloud links use the player widget', () => {
        expect(embedFor('https://soundcloud.com/band/song')).toEqual({ kind: 'soundcloud', src: 'https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fband%2Fsong&color=%23c89b3c', height: 166 });
    });
    test('anything else is a plain link', () => {
        expect(embedFor('https://band.bandcamp.com/album/x')).toEqual({ kind: 'link', src: 'https://band.bandcamp.com/album/x' });
        expect(embedFor('')).toBeNull();
        expect(embedFor('nope')).toBeNull();
    });
});
