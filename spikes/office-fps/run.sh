#!/bin/zsh
# Throwaway: runs every config twice-ish and prints one RESULT line each. Needs the dev server:
#   node_modules/.bin/vite --config spikes/office-fps/vite.config.ts
# Window 1440x900 at pixel ratio 1.5 = what an M1 Air's own screen gives the office (dpr is capped at 1.5).
cd "$(dirname "$0")/../.."
E="node_modules/.bin/electron spikes/office-fps/electron-main.mjs"
S="--size=1440x900"
run() { timeout 100 ${=E} "$1" $S ${@:2} 2>&1 | grep -E "^(RESULT|TIMEOUT)"; }

echo "## vsync (what the user would see)"
run "?label=vsync-6chars-full&fixdpr=1.5"
echo "## uncapped (frame cost = headroom)"
run "?label=A-6chars-full&fixdpr=1.5" --uncapped
run "?label=B-6chars-toon&fixdpr=1.5&toon=1" --uncapped
run "?label=C-6chars-noshadow&fixdpr=1.5&shadows=0" --uncapped
run "?label=D-furniture-only&fixdpr=1.5&chars=0" --uncapped
run "?label=E-chars-only&fixdpr=1.5&furn=0" --uncapped
run "?label=F-12chars-full&fixdpr=1.5&chars=12" --uncapped
run "?label=G-6chars-dpr2&fixdpr=2" --uncapped
run "?label=H-6chars-nolabels&fixdpr=1.5&labels=0" --uncapped
