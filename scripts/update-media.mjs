// Scans media/ and downloads/ and writes media.json, which the site reads.
// Run:  node scripts/update-media.mjs
//
// Optional: media/meta.json adds titles, descriptions or external links, e.g.
// {
//   "films/my-short.mp4": { "title": "My Short", "description": "Shot on the Ninja" },
//   "links": [ { "type": "films", "title": "Ride vlog", "youtube": "dQw4w9WgXcQ" } ],
//   "app": { "name": "ClipDeck", "tagline": "...", "version": "0.1.0", "releaseUrl": "https://github.com/..." }
// }
import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { join, extname, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const KINDS = {
  films: [".mp4", ".webm", ".mov", ".m4v"],
  photos: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"],
  music: [".mp3", ".wav", ".ogg", ".m4a", ".flac", ".aac"],
};
const DOWNLOADS = [".exe", ".msi", ".zip", ".dmg", ".appimage"];

const pretty = (file) =>
  basename(file, extname(file)).replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

async function list(dir, exts, prefix) {
  let names = [];
  try { names = await readdir(join(root, dir)); } catch { return []; }
  const out = [];
  for (const name of names) {
    if (!exts.includes(extname(name).toLowerCase())) continue;
    const s = await stat(join(root, dir, name));
    out.push({
      file: `${prefix}/${name}`,
      path: `${dir}/${name}`.replace(/\\/g, "/"),
      title: pretty(name),
      size: s.size,
      date: s.mtime.toISOString(),
    });
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

let meta = {};
try { meta = JSON.parse(await readFile(join(root, "media", "meta.json"), "utf8")); } catch {}

const result = { generated: new Date().toISOString() };
for (const [kind, exts] of Object.entries(KINDS)) {
  const items = await list(`media/${kind}`, exts, kind);
  for (const it of items) {
    const m = meta[it.file];
    if (m) Object.assign(it, m);
    delete it.file;
  }
  const links = (meta.links || []).filter((l) => l.type === kind).map(({ type, ...rest }) => rest);
  result[kind] = [...links, ...items];
}
result.downloads = (await list("downloads", DOWNLOADS, "downloads")).map(({ file, ...rest }) => rest);
if (meta.app) result.app = meta.app;

await writeFile(join(root, "media.json"), JSON.stringify(result, null, 2) + "\n");
console.log(
  `media.json: ${result.films.length} films, ${result.photos.length} photos, ${result.music.length} songs, ${result.downloads.length} downloads`
);
