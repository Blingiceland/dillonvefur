#!/usr/bin/env bash
# Builds public/og-play.jpg - the 1200x630 link preview for https://www.dillon.is/play
# (the "Viltu spila a Dillon?" gig-application page). Regenerate with:
#   bash scripts/og/build-play-og.sh
# Needs ffmpeg with libfreetype and the Bebas Neue font (the site's heading face);
# pass a path to BebasNeue-Regular.ttf as $1, or it falls back to Impact.
set -euo pipefail
cd "$(dirname "$0")/../.."

SRC="src/assets/live_music_new.jpg"     # 8368x5584 live shot
OUT="public/og-play.jpg"
FONT="${1:-C:/Windows/Fonts/impact.ttf}"
# ffmpeg's filter parser splits options on ":", so an absolute Windows path ("C:/...") cannot
# be passed to drawtext. Everything drawtext reads is staged in a relative scratch dir instead.
TMP=".og-build"
rm -rf "$TMP"; mkdir -p "$TMP"
trap 'rm -rf "$TMP"' EXIT
cp "$FONT" "$TMP/font.ttf"
FONT="$TMP/font.ttf"
TMPW="$TMP"

GOLD="0xc89b3c"
CREAM="0xf0e6cc"
MUTED="0xe4dccb"

# Text lives in files so Icelandic characters never go through filter-string escaping.
printf '%s' 'H L J Ó M S V E I T I R   &   T Ó N L I S T A R F Ó L K' > "$TMP/kicker.txt"
printf '%s' 'VILTU SPILA Á DILLON?'                                   > "$TMP/head.txt"
printf '%s' 'Sjáðu hvaða kvöld eru laus og sæktu um á netinu'         > "$TMP/sub.txt"
printf '%s' 'D I L L O N . I S / P L A Y'                             > "$TMP/url.txt"

# Crop 1.91:1 off the top of the frame (keeps the singer, drops the floor). The shot is already
# black and white, so the scrim is a single luma ramp - stacked drawboxes left visible seams.
FILTER="crop=8368:4393:0:150,scale=1200:630,eq=contrast=1.06"
FILTER+=",format=gray,geq=lum='lum(X,Y)*(0.66-0.44*clip((Y-140)/470,0,1))',format=yuv444p"

t() { # t <textfile> <size> <color> <y>
    printf ",drawtext=fontfile='%s':textfile='%s':fontsize=%s:fontcolor=%s:x=(w-text_w)/2:y=%s:shadowcolor=black@0.55:shadowx=0:shadowy=2" \
        "$FONT" "$1" "$2" "$3" "$4"
}

FILTER+=$(t "$TMPW/kicker.txt" 21 "$GOLD"  252)
FILTER+=$(t "$TMPW/head.txt"   94 "$CREAM" 290)
FILTER+=$(t "$TMPW/sub.txt"    29 "$MUTED" 424)
# Gold rule + framed URL under the subline
FILTER+=",drawbox=x=550:y=482:w=100:h=2:color=${GOLD}@0.9:t=fill"
FILTER+=$(t "$TMPW/url.txt"    32 "$GOLD"  518)
FILTER+=",drawbox=x=0:y=622:w=1200:h=8:color=${GOLD}@0.95:t=fill"

ffmpeg -y -loglevel error -i "$SRC" -vf "$FILTER" -q:v 3 "$OUT"
echo "wrote $OUT"
