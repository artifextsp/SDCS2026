// js/recursos-viewer.js
(function () {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  // Modal (usa los IDs que ya tienes en el HTML)
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
    if (mBody) mBody.innerHTML = '';
  }
  if (mClose) mClose.addEventListener('click', closeModal);
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Utils
  const EXT = (u) => (u.split('?')[0].split('.').pop() || '').toLowerCase();
  const isHTTP = (u) => /^https?:\/\//i.test(u);

  function toEmbeddable(url) {
    try {
      const u = new URL(url);
      if (u.hostname.includes('drive.google.com')) {
        const m = url.match(/\/file\/d\/([^/]+)/);
        const id = m ? m[1] : u.searchParams.get('id');
        if (id) return `https://drive.google.com/file/d/${id}/preview`;
      }
      if (u.hostname.includes('youtube.com') || u.hostname === 'youtu.be') {
        let id = '';
        if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
        else id = u.searchParams.get('v');
        if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      }
      return url;
    } catch { return url; }
  }

  function normalizeUrl(url) {
    if (!url) return '';
    if (isHTTP(url)) return toEmbeddable(url);
    const SUPABASE_URL = window.SUPABASE_URL || localStorage.getItem('SUPABASE_URL') || '';
    if (SUPABASE_URL && url.includes('/')) {
      return `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1/object/public/${url.replace(/^\/+/, '')}`;
    }
    return url;
  }

  function buildEmbedEl(url, tipo) {
    const ext = EXT(url);

    if (tipo === 'imagen' || /^(jpg|jpeg|png|gif|webp|svg)$/.test(ext)) {
      const img = new Image();
      img.src = url;
      img.alt = '';
      img.className = 'embed-img';
      return img;
    }
    if (tipo === 'video' || /^(mp4|webm|ogg)$/.test(ext)) {
      const v = document.createElement('video');
      v.controls = true;
      v.src = url;
      v.className = 'embed-video';
      return v;
    }
    if (tipo === 'audio' || /^(mp3|wav|ogg)$/.test(ext)) {
      const a = document.createElement('audio');
      a.controls = true;
      a.src = url;
      a.className = 'embed-audio';
      return a;
    }

    const ifr = document.createElement('iframe');
    ifr.className = 'embed-iframe';
    ifr.allowFullscreen = true;
    ifr.setAttribute('loading', 'eager');
    if (ext === 'pdf' && !url.includes('#')) ifr.src = `${url}#view=fitH`;
    else ifr.src = url;
    return ifr;
  }

  function openRecurso({ url, tipo, titulo }) {
    const finalUrl = normalizeUrl(url);
    if (mTitle) mTitle.textContent = titulo || 'Recurso';
    if (mBody) {
      mBody.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = 'embed-wrap';

      const iframeOrMedia = buildEmbedEl(finalUrl, (tipo || '').toLowerCase());
      wrap.appendChild(iframeOrMedia);

      const fb = document.createElement('div');
      fb.className = 'embed-fallback hidden';
      fb.innerHTML = `
        <p>No se puede mostrar el recurso aquí (el sitio lo bloquea).</p>
        <a class="btn-open" target="_blank" rel="noopener" href="${finalUrl}">Abrir en pestaña nueva</a>
      `;
      wrap.appendChild(fb);

      // Mostrar fallback si el contenido no “carga” en ~1.5s
      let shown = false;
      const timer = setTimeout(() => {
        if (!shown) fb.classList.remove('hidden');
      }, 1500);

      iframeOrMedia.addEventListener('load', () => {
        shown = true;
        clearTimeout(timer);
        fb.classList.add('hidden');
      });
      iframeOrMedia.addEventListener('error', () => {
        shown = true;
        clearTimeout(timer);
        fb.classList.remove('hidden');
      });

      mBody.appendChild(wrap);
    }
    openModal();
  }

  // Delegación en contenedor de recursos
  const cont = document.querySelector('#recursos');
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

  // Soporte para botones sueltos con .btn-recurso
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
