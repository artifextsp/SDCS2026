// js/recursos-viewer.js
(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  // ----- Modal base (usa los IDs que ya tienes en dashboard-estudiante.html)
  const modal  = $('#modal');
  const mBody  = $('#mBody');
  const mTitle = $('#mTitle');
  const mClose = $('#mClose');

  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
    mBody.innerHTML = '';
  }
  if (mClose) mClose.addEventListener('click', closeModal);
  if (modal) {
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  }

  // ----- Utilidades
  const isHTTP = (u) => /^https?:\/\//i.test(u);
  const EXT = (u) => (u.split('#')[0].split('?')[0].split('.').pop() || '').toLowerCase();

  // Convierte links de Drive y YouTube a formato embebible
  function toEmbeddable(url) {
    try {
      const u = new URL(url);
      // Google Drive
      if (u.hostname.includes('drive.google.com')) {
        const m = url.match(/\/file\/d\/([^/]+)/);
        const id = m ? m[1] : u.searchParams.get('id');
        if (id) return `https://drive.google.com/file/d/${id}/preview`;
      }
      // YouTube
      if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
        let id = '';
        if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
        else id = u.searchParams.get('v');
        if (id) return `https://www.youtube.com/embed/${id}`;
      }
      return url; // tal cual
    } catch {
      return url;
    }
  }

  // Decodifica 1–2 veces si viene como "https%3A%2F%2F..." o con doble codificación
function smartDecode(u) {
  let x = String(u || '');
  try {
    const d1 = decodeURIComponent(x);
    if (d1 !== x) x = d1;
    const d2 = decodeURIComponent(x);
    if (d2 !== x) x = d2;
  } catch (_) { /* ignora */ }
  return x;
}
  
  function normalizeUrl(raw) {
  let url = String(raw || '').trim();
  if (!url) return '';

  // Si viene como "https%3A%2F%2F..." lo decodificamos primero
  if (/^(https?|http)%3A%2F%2F/i.test(url)) url = smartDecode(url);

  // Si es ruta de storage con doble codificación (%2520, etc.) también decodifica
  if (!/^https?:\/\//i.test(url) && /%25[0-9A-Fa-f]{2}/.test(url)) {
    url = smartDecode(url);
  }

  // Ya absoluta → convertir a formato embebible (YouTube/Drive)
  if (/^https?:\/\//i.test(url)) return toEmbeddable(url);

  // Ruta relativa de Storage → construir URL pública
  const base =
    (window.SUPABASE_URL ||
     localStorage.getItem('SUPABASE_URL') ||
     '').replace(/\/+$/,''); // sin barra final

  if (!base) return url; // último recurso

  const clean = url.replace(/^\/+/, '');
  // No sobre-codificar: si ya trae %HH, se deja tal cual; solo espacios crudos → %20
  const encoded = /%[0-9A-Fa-f]{2}/.test(clean) ? clean : clean.replace(/ /g, '%20');

  return `${base}/storage/v1/object/public/${encoded}`;
}


  // Mensaje de fallback
  function showOpenExtern(url) {
    mBody.innerHTML = `
      <div class="embed-fallback">
        <p>No se puede mostrar el recurso aquí (el sitio lo bloquea).</p>
        <a class="btn-open" target="_blank" rel="noopener" href="${url}">Abrir en pestaña nueva</a>
      </div>`;
  }

  // Crea el elemento embebido correcto
  function buildEmbed(url, tipo) {
    const ext = EXT(url);

    // Imagen
    if (tipo === 'imagen' || /^(jpg|jpeg|png|gif|webp|svg)$/i.test(ext)) {
      const img = new Image();
      img.src = url;             // ¡sin encodeURI!
      img.alt = '';
      img.className = 'embed-img';
      return img;
    }

    // Video archivo
    if (tipo === 'video' || /^(mp4|webm|ogg)$/i.test(ext)) {
      const v = document.createElement('video');
      v.controls = true;
      v.src = url;
      v.className = 'embed-video';
      return v;
    }

    // Audio archivo
    if (tipo === 'audio' || /^(mp3|wav|ogg)$/i.test(ext)) {
      const a = document.createElement('audio');
      a.controls = true;
      a.src = url;
      a.className = 'embed-audio';
      return a;
    }

    // PDF / Web embebida
    const ifr = document.createElement('iframe');
    ifr.className = 'embed-iframe';
    ifr.allowFullscreen = true;
    ifr.setAttribute('loading', 'eager');

    // Para PDF ajustamos vista horizontal; no codificar la URL completa
    if (ext === 'pdf' && !/#/.test(url)) {
      ifr.src = `${url}#view=fitH`;
    } else {
      ifr.src = url;
    }

    // Fallback si el sitio bloquea el embed (X-Frame-Options)
    const guard = setTimeout(() => showOpenExtern(url), 1500);
    ifr.addEventListener('load', () => clearTimeout(guard));
    ifr.addEventListener('error', () => showOpenExtern(url));
    return ifr;
  }

  // Abre recurso en el modal
  function openRecurso({ url, tipo, titulo }) {
    const finalUrl = normalizeUrl(url);
    mTitle.textContent = titulo || 'Recurso';
    mBody.innerHTML = '';
    const el = buildEmbed(finalUrl, (tipo || '').toLowerCase());
    mBody.appendChild(el);
    openModal();
  }

  // Delegación de eventos (chips/links con data-*)
  const cont = document; // escuchamos a nivel documento por simplicidad
  cont.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-recurso-url],[data-url],.btn-recurso');
    if (!btn) return;

    e.preventDefault();
    openRecurso({
      url:   btn.dataset.recursoUrl || btn.dataset.url || btn.getAttribute('href'),
      tipo:  btn.dataset.recursoTipo || btn.dataset.tipo || '',
      titulo:btn.dataset.recursoTitulo || btn.innerText.trim(),
    });
  });
})();
