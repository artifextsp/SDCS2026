// js/recursos-viewer.js
// Visor de recursos para el dashboard del estudiante.
// Abre PDFs, imágenes, audio/video, YouTube/Drive, y hace fallback sólo si de verdad no carga.

(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  // ----- Referencias al modal ya existente en tu HTML -----
  const modal = $('#modal');
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
    // Cerrar al clickear el backdrop
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // ----- Utils -----
  const EXT = (u) => (u.split('?')[0].split('.').pop() || '').toLowerCase();
  const isHTTP = (u) => /^https?:\/\//i.test(u);

  // Normaliza URL a formato embebible (Drive/YouTube)
  function toEmbeddable(url) {
    try {
      const u = new URL(url);

      // Google Drive
      if (u.hostname.includes('drive.google.com')) {
        // /file/d/ID/view -> /file/d/ID/preview
        const m = url.match(/\/file\/d\/([^/]+)/);
        const id = m ? m[1] : u.searchParams.get('id');
        if (id) return `https://drive.google.com/file/d/${id}/preview`;
      }

      // YouTube
      if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
        let id = '';
        if (u.hostname === 'youtu.be') {
          id = u.pathname.slice(1);
        } else {
          // youtube.com/watch?v=ID
          id = u.searchParams.get('v') || '';
          // también soporta /shorts/ID o /embed/ID
          if (!id) {
            const parts = u.pathname.split('/').filter(Boolean);
            const idxShorts = parts.indexOf('shorts');
            const idxEmbed  = parts.indexOf('embed');
            if (idxShorts !== -1 && parts[idxShorts + 1]) id = parts[idxShorts + 1];
            if (idxEmbed  !== -1 && parts[idxEmbed  + 1]) id = parts[idxEmbed  + 1];
          }
        }
        if (id) return `https://www.youtube.com/embed/${id}`;
      }

      return url;
    } catch {
      return url;
    }
  }

  // Si la URL es ruta de Storage, la volvemos pública con tu instancia
  function normalizeUrl(url) {
    if (!url) return '';
    if (isHTTP(url)) return toEmbeddable(url);

    // Ruta tipo "bucket/carpeta/archivo.pdf"
    const SB_URL =
      window.SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || '';
    if (SB_URL && url.includes('/')) {
      return `${SB_URL.replace(/\/+$/, '')}/storage/v1/object/public/${url.replace(/^\/+/, '')}`;
    }
    return url;
  }

  function renderFallbackOpen(url) {
    mBody.innerHTML = `
      <div class="embed-fallback">
        <p>No se puede mostrar el recurso aquí (el sitio lo bloquea).</p>
        <a class="btn-open" target="_blank" rel="noopener" href="${url}">Abrir en pestaña nueva</a>
      </div>`;
  }

  function buildEmbed(url, tipo) {
    const ext = EXT(url);

    // Imagen
    if (tipo === 'imagen' || /^(jpg|jpeg|png|gif|webp|svg)$/.test(ext)) {
      const img = new Image();
      img.src = url;
      img.alt = '';
      img.className = 'embed-img';
      return img;
    }

    // Video
    if (tipo === 'video' || /^(mp4|webm|ogg)$/.test(ext)) {
      const v = document.createElement('video');
      v.controls = true;
      v.src = url;
      v.className = 'embed-video';
      return v;
    }

    // Audio
    if (tipo === 'audio' || /^(mp3|wav|ogg)$/.test(ext)) {
      const a = document.createElement('audio');
      a.controls = true;
      a.src = url;
      a.className = 'embed-audio';
      return a;
    }

    // PDF o sitios embebibles -> iframe
    const ifr = document.createElement('iframe');
    ifr.className = 'embed-iframe';
    ifr.allowFullscreen = true;
    ifr.setAttribute('loading', 'eager'); // queremos que cargue ya en modal

    // Para PDF ajusta la vista (no tocar proporciones)
    if (ext === 'pdf' && !url.includes('#')) {
      ifr.src = `${url}#view=fitH`;
    } else {
      ifr.src = url;
    }

    // Guard suave: si en ~4s no hubo 'load', mostramos fallback
    let loaded = false;
    const timer = setTimeout(() => {
      if (!loaded) renderFallbackOpen(url);
    }, 4000);

    ifr.addEventListener('load', () => {
      loaded = true;
      clearTimeout(timer);
      // Dejar el iframe tal cual; si el sitio se autoredirige a algo bloqueado,
      // ya no podremos detectarlo de forma fiable, pero esto cubre 99% de casos.
    });

    // Nota: no forzamos fallback en 'error' porque algunos visores (PDF) emiten
    // eventos que no significan bloqueo real. El guard de arriba es suficiente.
    return ifr;
  }

  function openRecurso({ url, tipo, titulo }) {
    const finalUrl = normalizeUrl(url);
    mTitle.textContent = titulo || 'Recurso';
    mBody.innerHTML = '';

    const el = buildEmbed(finalUrl, (tipo || '').toLowerCase());
    mBody.appendChild(el);

    openModal();
  }

  // ----- Delegación en #recursos (botones dentro de la sección Recursos)
  const cont = $('#recursos');
  if (cont) {
    cont.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-recurso-url],[data-url]');
      if (!btn) return;
      e.preventDefault();
      openRecurso({
        url: btn.dataset.recursoUrl || btn.dataset.url || btn.getAttribute('href'),
        tipo: btn.dataset.recursoTipo || btn.dataset.tipo || '',
        titulo: btn.dataset.recursoTitulo || btn.innerText.trim(),
      });
    });
  }

  // Y también chips globales con clase .btn-recurso
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-recurso');
    if (!btn) return;
    e.preventDefault();
    openRecurso({
      url: btn.dataset.recursoUrl || btn.dataset.url || btn.getAttribute('href'),
      tipo: btn.dataset.recursoTipo || btn.dataset.tipo || '',
      titulo: btn.dataset.recursoTitulo || btn.innerText.trim(),
    });
  });
})();
