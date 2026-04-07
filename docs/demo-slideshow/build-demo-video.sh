#!/usr/bin/env bash
# Build demo-slideshow.mp4 from images/ + slides.manifest (PNG slideshow, 1920x1080).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
IMG="$ROOT/images"
TMP="$ROOT/.build-tmp"
OUT="$ROOT/demo-slideshow.mp4"
MANIFEST="$ROOT/slides.manifest"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
mkdir -p "$TMP"
rm -f "$TMP"/seg_*.mp4 "$TMP"/concat.txt

i=0
while IFS= read -r line || [[ -n "$line" ]]; do
  [[ "$line" =~ ^[[:space:]]*$ ]] && continue
  [[ "$line" =~ ^[[:space:]]*# ]] && continue
  dur="${line##* }"
  file="${line% *}"
  [[ -z "$file" ]] && continue
  src="$IMG/$file"
  if [[ ! -f "$src" ]]; then
    echo "Missing: $src (run gen-placeholders.sh if needed)"
    exit 1
  fi
  i=$((i + 1))
  padded=$(printf '%03d' "$i")
  ffmpeg -nostdin -y -hide_banner -loglevel error \
    -loop 1 -t "$dur" -i "$src" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,format=yuv420p" \
    -r 30 -c:v libx264 -pix_fmt yuv420p \
    "$TMP/seg_${padded}.mp4"
done < <(grep -v '^#' "$MANIFEST" | grep -v '^[[:space:]]*$' || true)

if [[ "$i" -eq 0 ]]; then
  echo "No slides in $MANIFEST"
  exit 1
fi

for f in "$TMP"/seg_*.mp4; do
  echo "file '$(basename "$f")'"
done | sort > "$TMP/concat.txt"

(
  cd "$TMP"
  ffmpeg -nostdin -y -hide_banner -loglevel error -f concat -safe 0 -i concat.txt -c copy "../$(basename "$OUT")"
)

echo "Wrote $OUT"
du -h "$OUT"
