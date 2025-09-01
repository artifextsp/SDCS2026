// js/recursos-viewer.js
(function () {
  "use strict";

  // -------------------- DOM helpers --------------------
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  // Modal (IDs ya existentes en tu HTML)
  const modal  = $("#modal");
  const mBody  = $("#mBody");
  const mTitle = $("#mTitle");
  const mClose = $("#mClose");

  function openModal() {
    if (!modal) return;
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    document.body.style.overflow = "";
    if (mBody) mBody.innerHTML = "";
  }

  if (mClose) mClose.addEventListener("click", closeModal);
  if (modal) {
    // Cerrar al clicar fuera del cuadro
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    // Cerrar con ESC
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
  }

  // -------------------- Utils --------------------
  const isHTTP = (u) => /^https?:\/\//i.test(u);
  const EXT = (u) => (String(u || "").split("#")[0].split("?")[0].split(".").pop() || "").toLowerCase();

  // Decodifica 1–2 veces si viene como https%3A%2F%2F...
  function smartDecode(u) {
    let x = String(u || "");
    try {
      const d1 = decodeURIComponent(x);
      if (d1 !== x) x = d1;
      const d2 = decodeURIComponent(x);
      if (d2 !== x) x = d2;
    } catch (_) {}
    return x;
  }

  // Convierte links a formato embebible cuando aplica (Drive/YouTube)
  function toEmbeddable(url) {
    try {
      const u = new URL(url);

      // Google Drive: /file/d/ID/preview
      if (u.hostname.includes("drive.google.com")) {
        const m = url.match(/\/file\/d\/([^/]+)/);
        const id = m ? m[1] : u.searchParams.get("id");
        if (id) return `https://drive.google.com/file/d/${id}/preview`;
      }

      // YouTube
      if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
        let id = "";
        if (u.hostname === "youtu.be") id = u.pathname.slice(1);
        else id = u.searchParams.get("v");
        if (id) return `https://www.youtube.com/embed/${id}`;
      }

      return url;
    } catch {
      return url;
    }
  }

  // Si es ruta de Storage, la volvemos pública; si es http, normalizamos a embebible
  function normalizeUrl(raw) {
    let url = String(raw || "").trim();
    if (!url) return "";

    // https%3A%2F%2F... -> decodificar
    if (/^https?%3A%2F%2F/i.test(url)) url = smartDecode(url);

    // Doble codificación en rutas (p.e. %2520)
    if (!/^https?:\/\//i.test(url) && /%25[0-9A-F]{2}/i.test(url)) {
      url = smartDecode(url);
    }

    if (isHTTP(url)) return toEmbeddable(url);

    // Ruta relativa de supabase storage (bucket/carpeta/archivo.pdf)
    const base = (window.SUPABASE_URL || localStorage.getItem("SUPABASE_URL") || "").replace(/\/+$/, "");
    if (!base) return url;

    const clean   = url.replace(/^\/+/, "");
    const encoded = /%[0-9A-F]{2}/i.test(clean) ? clean : clean.replace(/ /g, "%20");
    return `${base}/storage/v1/object/public/${encoded}`;
  }

  function showOpenExtern(url) {
    if (!mBody) return;
    mBody.innerHTML = `
      <div class="embed-fallback">
        <p>No se puede mostrar el recurso aquí (el sitio lo bloquea).</p>
        <a class="btn-open" target="_blank" rel="noopener" href="${url}">Abrir en pestaña nueva</a>
      </div>`;
  }

  // Crea el elemento embebido correcto y ocupa TODO el body
  function buildEmbed(url, tipo) {
    const ext = EXT(url);

    // Imagen
    if ((tipo || "").toLowerCase() === "imagen" || /^(jpg|jpeg|png|gif|webp|svg)$/i.test(ext)) {
      const img = new Image();
      img.src = url;
      img.alt = "";
      img.className = "embed-img";
      return img;
    }

    // Video archivo
    if ((tipo || "").toLowerCase() === "video" || /^(mp4|webm|ogg)$/i.test(ext)) {
      const v = document.createElement("video");
      v.controls = true;
      v.src = url;
      v.className = "embed-video";
      return v;
    }

    // Audio archivo
    if ((tipo || "").toLowerCase() === "audio" || /^(mp3|wav|ogg)$/i.test(ext)) {
      const a = document.createElement("audio");
      a.controls = true;
      a.src = url;
      a.className = "embed-audio";
      return a;
    }

    // Iframe (PDF/YouTube/Drive/sites)
    const ifr = document.createElement("iframe");
    ifr.className = "embed-iframe";
    ifr.allowFullscreen = true;
    ifr.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
    );

    // PDF → vista horizontal
    if (ext === "pdf" && !/#/.test(url)) ifr.src = `${url}#view=fitH`;
    else ifr.src = url;

    // Fallback si el sitio bloquea embebido
    const guard = setTimeout(() => showOpenExtern(url), 1500);
    ifr.addEventListener("load", () => clearTimeout(guard));
    ifr.addEventListener("error", () => showOpenExtern(url));

    return ifr;
  }

  // -------------------- API pública del visor (por delegación) --------------------
  function openRecurso({ url, tipo, titulo }) {
    if (!mBody || !mTitle) return;

    const finalUrl = normalizeUrl(url);
    mTitle.textContent = titulo || "Recurso";
    mBody.innerHTML = "";

    const el = buildEmbed(finalUrl, tipo || "");
    mBody.appendChild(el);
    openModal();
  }

  // Delegación (chips/botones/enlaces con data-*)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-recurso-url],[data-url],.btn-recurso");
    if (!btn) return;

    e.preventDefault();
    openRecurso({
      url:    btn.dataset.recursoUrl || btn.dataset.url || btn.getAttribute("href"),
      tipo:   btn.dataset.recursoTipo || btn.dataset.tipo || "",
      titulo: btn.dataset.recursoTitulo || btn.innerText.trim(),
    });
  });
})();
