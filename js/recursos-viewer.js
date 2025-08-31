// js/recursos-viewer.js
(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // ----- Modal base (usa los IDs que ya tienes en dashboard-estudiante.html)
  const modal = $('#modal');
  const mBody = $('#mBody');
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
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // ----- Utilidades
  const EXT = (u) => (u.split('?')[0].split('.').pop() || '').toLowerCase();
  const isHTTP = (u) => /^https?:\/\//i.test(u);

  // Convierte links de Drive y YouTube a formato embebible
  function toEmbeddable(url) {
    try {
      const u = new URL(url);
      // Google Drive: /file/d/ID/view  -> /file/d/ID/preview
      if (u.hostname.includes('drive.google.com')) {
        // Casos: /file/d/ID/view  o  open?id=ID
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
      return url;
    } catch {
      return url;
    }
  }

  // Si el valor guardado es una ruta de Storage, la volvemos pública
  function normalizeUrl(url) {
    if (!url) return '';
    if (isHTTP(url)) return toEmbeddable(url);

    // Ruta tipo "bucket/carpeta/archivo.pdf"
    const SUPABASE_URL =
      window.SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || '';
    if (SUPABASE_URL && url.includes('/')) {
      return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${url.replace(/^\/+/, '')}`;
    }
    return url; // último recurso
  }

  function showOpenExtern(url) {
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

    // PDF o genérico en iframe
    const ifr = document.createElement('iframe');
    ifr.className = 'embed-iframe';
    ifr.allowFullscreen = true;
    ifr.setAttribute('loading', 'eager');

    // PDF: ajusta vista
    if (ext === 'pdf' && !url.includes('#')) {
      ifr.src = `${url}#view=fitH`;
    } else {
      ifr.src = url;
    }

    // Fallback si está bloqueado por X-Frame-Options
    const guard = setTimeout(() => {
      // No podemos detectar 100% bloqueo CORS, pero si nada se renderiza, ofrecemos abrir fuera
      if (!ifr.contentDocument && !ifr.contentWindow) {
        showOpenExtern(url);
      }
    }, 1500);

    ifr.addEventListener('load', () => clearTimeout(guard));
    ifr.addEventListener('error', () => showOpenExtern(url));
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

  // ----- Delegación de eventos en el contenedor de recursos
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

  // Por si también tienes chips fuera de #recursos
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
