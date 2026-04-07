#!/usr/bin/env bash
# Generate placeholder PNGs (1920x1080) for logged-in-only scenes.
# Replace these files with real screenshots, then run build-demo-video.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
IMG="$ROOT/images"
FONT="/System/Library/Fonts/Supplemental/Arial.ttf"
mkdir -p "$IMG"

mk() {
  local out="$1" t1="$2" t2="$3" t3="$4"
  local vf="drawtext=fontfile=${FONT}:text='${t1}':fontcolor=white:fontsize=38:x=(w-text_w)/2:y=h/2-100,drawtext=fontfile=${FONT}:text='${t2}':fontcolor=0xcbd5e1:fontsize=28:x=(w-text_w)/2:y=h/2-15,drawtext=fontfile=${FONT}:text='${t3}':fontcolor=0x64748b:fontsize=24:x=(w-text_w)/2:y=h/2+55"
  ffmpeg -nostdin -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=0x0f172a:s=1920x1080" -frames:v 1 \
    -vf "$vf" -update 1 "$IMG/$out"
}

mk "05-REPLACE-onboarding.png" \
  "REPLACE - log in at adbrain-chi" \
  "Screenshot /onboarding + Connect Google Ads" \
  "adwords scope + ScopeVisualizer after connect"

mk "06-REPLACE-connections.png" \
  "REPLACE - logged-in screenshot" \
  "Screenshot /dashboard/connections" \
  "token health + TikTok Coming Soon"

mk "07-REPLACE-proposals.png" \
  "REPLACE - logged-in screenshot" \
  "Screenshot /dashboard/proposals" \
  "MEDIUM budget + Approve + toast"

mk "08-REPLACE-dashboard-agent.png" \
  "REPLACE - logged-in screenshot" \
  "Screenshot /dashboard Analyze Campaigns" \
  "analysis stream + HIGH proposal"

mk "09-REPLACE-mfa.png" \
  "REPLACE - during MFA flow" \
  "Screenshot Approve MFA + Auth0 step-up" \
  "TOTP then Executed status"

mk "10-REPLACE-audit.png" \
  "REPLACE - logged-in screenshot" \
  "Screenshot /dashboard/audit" \
  "token exchange + API + MFA timeline"

mk "11-REPLACE-settings.png" \
  "REPLACE - logged-in screenshot" \
  "Screenshot /dashboard/settings LLM Usage" \
  "optional Vercel Analytics"

mk "12-closing-card.png" \
  "AdBrain demo build" \
  "adbrain-chi.vercel.app" \
  "add https prefix + blog or GitHub in editor"

echo "Wrote placeholders to $IMG"
