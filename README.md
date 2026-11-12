# brysite

Static site for bry400.com (GitHub Pages). No build step.

## Adding content

1. Drop files in:
   - `media/films/` (.mp4, .webm)
   - `media/photos/` (.jpg, .png, .webp)
   - `media/music/` (.mp3, .wav, .m4a)
   - `downloads/` (installers: .exe, .msi, .zip)
2. Run `node scripts/update-media.mjs` (rebuilds `media.json`).
3. Commit and push.

Titles come from filenames. Override them, add descriptions, or link a YouTube film in `media/meta.json`.

## Limits

GitHub blocks files over 100 MB and the repo gets heavy fast. For long films, upload to YouTube and add
`{ "type": "films", "title": "...", "youtube": "<video id>" }` under `links` in `media/meta.json`.
For big installers, use a GitHub Release and set `app.releaseUrl` in `media/meta.json`.
