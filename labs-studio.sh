#!/usr/bin/env sh
# Membuka Labs Studio di Mac/Linux (padanan "Labs Studio.bat" di Windows).
# Server berjalan di terminal ini; tutup terminal (atau Ctrl+C) untuk berhenti.
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 18+ belum terpasang: https://nodejs.org" >&2
  exit 1
fi
command -v ffmpeg >/dev/null 2>&1 || echo "Catatan: ffmpeg belum terpasang, ekspor MP4 & impor video belum bisa dipakai."

[ -d node_modules ] || { echo "Menyiapkan studio pertama kali..."; npm install || exit 1; }

URL=http://localhost:5173
# buka browser setelah server siap
(
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    sleep 1
    curl -fs "$URL/api/info" >/dev/null 2>&1 && break
  done
  if command -v open >/dev/null 2>&1; then open "$URL"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"; fi
) &

exec npm run dev
