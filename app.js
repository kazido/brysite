(() => {
  const $ = (id) => document.getElementById(id);
  const VIEWS = ["home", "films", "photos", "music", "apps", "about"];
  let data = { films: [], photos: [], music: [], downloads: [] };

  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    kids.flat().forEach((k) => n.append(k));
    return n;
  };
  const url = (p) => encodeURI(p);
  const fmtSize = (b) => (b >= 1e9 ? (b / 1e9).toFixed(1) + " GB" : b >= 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB");
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "");
  const fmtTime = (s) => (isFinite(s) ? Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0") : "0:00");

  /* ---------- Theme ---------- */
  const themeSel = $("theme");
  themeSel.value = document.documentElement.dataset.theme;
  themeSel.addEventListener("change", () => {
    document.documentElement.dataset.theme = themeSel.value;
    try { localStorage.setItem("theme", themeSel.value); } catch (e) {}
  });

  /* ---------- Routing ---------- */
  function route() {
    const v = VIEWS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "home";
    VIEWS.forEach((n) => ($("view-" + n).hidden = n !== v));
    document.querySelectorAll(".nav").forEach((a) => a.classList.toggle("active", a.dataset.view === v));
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* ---------- Empty states ---------- */
  function empty(id, title, folder, exts) {
    const box = $(id);
    box.hidden = false;
    box.replaceChildren(
      el("h2", { textContent: title }),
      el("p", {}, "Drop ", exts, " files into ", el("code", { textContent: folder }), " then run ", el("code", { textContent: "node scripts/update-media.mjs" }), "."),
    );
  }

  /* ---------- Films ---------- */
  function renderFilms() {
    $("n-films").textContent = data.films.length || "";
    if (!data.films.length) return empty("films-empty", "No films yet", "media/films", ".mp4 / .webm");
    $("films-grid").replaceChildren(
      ...data.films.map((f, i) => {
        const thumb = el("div", { className: "card-thumb" });
        if (f.youtube) thumb.append(el("img", { src: `https://i.ytimg.com/vi/${f.youtube}/hqdefault.jpg`, alt: "", loading: "lazy" }));
        else thumb.append(el("video", { src: url(f.path) + "#t=0.5", preload: "metadata", muted: true, playsInline: true }));
        thumb.append(el("div", { className: "play-chip", textContent: "▶" }));
        const card = el("button", { className: "card", type: "button" }, thumb,
          el("div", { className: "card-title", textContent: f.title }),
          el("div", { className: "card-meta", textContent: [f.size ? fmtSize(f.size) : "", fmtDate(f.date)].filter(Boolean).join(" · ") }));
        card.addEventListener("click", () => openLightbox(data.films, i, "film"));
        return card;
      }),
    );
  }

  /* ---------- Photos ---------- */
  function photoButton(list, i, kind) {
    const p = list[i];
    const b = el("button", { className: "photo", type: "button", ariaLabel: p.title }, el("img", { src: url(p.path), alt: p.title, loading: "lazy" }));
    b.addEventListener("click", () => openLightbox(list, i, kind));
    return b;
  }
  function renderPhotos() {
    $("n-photos").textContent = data.photos.length || "";
    if (!data.photos.length) return empty("photos-empty", "No photos yet", "media/photos", ".jpg / .png / .webp");
    $("photos-grid").replaceChildren(...data.photos.map((_, i) => photoButton(data.photos, i, "photo")));
    const latest = data.photos.slice(0, 6);
    $("latest").hidden = false;
    $("latest-grid").replaceChildren(...latest.map((_, i) => photoButton(latest, i, "photo")));
  }

  /* ---------- Lightbox ---------- */
  const lb = { list: [], i: 0, kind: "photo" };
  function showLb() {
    const it = lb.list[lb.i];
    const stage = $("lb-stage");
    stage.replaceChildren();
    if (lb.kind === "film") {
      stage.append(it.youtube
        ? el("iframe", { src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(it.youtube)}?autoplay=1`, allow: "autoplay; fullscreen", allowFullscreen: true })
        : el("video", { src: url(it.path), controls: true, autoplay: true }));
    } else stage.append(el("img", { src: url(it.path), alt: it.title }));
    $("lb-cap").replaceChildren(el("b", { textContent: it.title }), it.description ? ` — ${it.description}` : "");
    const multi = lb.list.length > 1;
    $("lb-prev").hidden = $("lb-next").hidden = !multi;
  }
  function openLightbox(list, i, kind) {
    Object.assign(lb, { list, i, kind });
    $("lightbox").hidden = false;
    document.body.style.overflow = "hidden";
    showLb();
  }
  function closeLightbox() {
    $("lightbox").hidden = true;
    $("lb-stage").replaceChildren(); // stops any playing video
    document.body.style.overflow = "";
  }
  const step = (d) => { lb.i = (lb.i + d + lb.list.length) % lb.list.length; showLb(); };
  $("lb-close").addEventListener("click", closeLightbox);
  $("lb-prev").addEventListener("click", () => step(-1));
  $("lb-next").addEventListener("click", () => step(1));
  $("lightbox").addEventListener("click", (e) => { if (e.target === $("lightbox") || e.target === $("lb-stage")) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if ($("lightbox").hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });

  /* ---------- Music ---------- */
  const audio = $("audio");
  let cur = -1;
  function renderMusic() {
    $("n-music").textContent = data.music.length || "";
    if (!data.music.length) return empty("music-empty", "No songs yet", "media/music", ".mp3 / .wav / .m4a");
    $("tracks").replaceChildren(
      ...data.music.map((t, i) => {
        const b = el("button", { className: "track", type: "button" },
          el("span", { className: "tno", textContent: i + 1 }),
          el("span", {}, el("div", { textContent: t.title }), el("div", { className: "tmeta", textContent: t.description || fmtDate(t.date) })),
          el("span", { className: "tmeta", textContent: t.size ? fmtSize(t.size) : "" }));
        b.addEventListener("click", () => (cur === i ? toggle() : play(i)));
        return el("li", {}, b);
      }),
    );
  }
  function play(i) {
    cur = i;
    const t = data.music[i];
    audio.src = url(t.path);
    audio.play().catch(() => {});
    $("player").hidden = false;
    $("p-title").textContent = t.title;
    markPlaying();
  }
  function toggle() { audio.paused ? audio.play() : audio.pause(); }
  function markPlaying() {
    document.querySelectorAll(".track").forEach((b, i) => {
      b.classList.toggle("playing", i === cur);
      b.querySelector(".tno").textContent = i === cur && !audio.paused ? "♪" : i + 1;
    });
    $("p-toggle").textContent = audio.paused ? "▶" : "⏸";
  }
  $("p-toggle").addEventListener("click", toggle);
  $("p-prev").addEventListener("click", () => play((cur - 1 + data.music.length) % data.music.length));
  $("p-next").addEventListener("click", () => play((cur + 1) % data.music.length));
  audio.addEventListener("play", markPlaying);
  audio.addEventListener("pause", markPlaying);
  audio.addEventListener("ended", () => play((cur + 1) % data.music.length));
  audio.addEventListener("timeupdate", () => {
    if (audio.duration) $("p-seek").value = (audio.currentTime / audio.duration) * 1000;
    $("p-cur").textContent = fmtTime(audio.currentTime);
    $("p-dur").textContent = fmtTime(audio.duration);
  });
  $("p-seek").addEventListener("input", (e) => { if (audio.duration) audio.currentTime = (e.target.value / 1000) * audio.duration; });

  /* ---------- Apps ---------- */
  function renderApps() {
    const app = data.app || { name: "ClipDeck", tagline: "", platform: "Windows" };
    const box = $("apps-list");
    const hosted = (app.downloads || []).map((d) => el("a", { className: "btn" + (d.primary ? " primary" : ""), href: d.url }, `${d.label}${d.size ? ` (${fmtSize(d.size)})` : ""}`));
    const local = (data.downloads || []).map((f) => el("a", { className: "btn", href: url(f.path), download: "" }, `Download ${f.path.split("/").pop()} (${fmtSize(f.size)})`));
    const files = [...hosted, ...local];
    const dl = files.length
      ? files
      : [el("span", { className: "muted", textContent: app.releaseUrl ? "" : "Installer coming soon." })];
    if (app.releaseUrl) dl.push(el("a", { className: "btn", href: app.releaseUrl, target: "_blank", rel: "noopener", textContent: "All releases ↗" }));
    box.replaceChildren(
      el("div", { className: "app-card" },
        el("img", { src: "assets/clipdeck.png", alt: app.name + " icon" }),
        el("div", {},
          el("h2", { textContent: app.name }),
          el("p", { className: "muted", textContent: app.tagline }),
          el("p", { className: "small muted", textContent: [app.version && "v" + app.version, app.platform].filter(Boolean).join(" · ") }),
          el("div", { className: "row dl-row" }, dl),
          el("p", { className: "small muted", style: "margin-top:10px", textContent: "Windows may show a SmartScreen warning because the installer isn't code-signed yet. Choose More info, then Run anyway." }),
        )),
    );
  }

  /* ---------- Boot ---------- */
  route();
  renderApps();
  fetch("media.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((j) => { data = Object.assign(data, j); })
    .catch(() => {})
    .finally(() => { renderFilms(); renderPhotos(); renderMusic(); renderApps(); });
})();
