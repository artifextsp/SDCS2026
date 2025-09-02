// /coordinador/coordinador.js
// Dashboard de Coordinación – SDCS (Fase 4.1)

import { supabase } from './coordSupabaseClient.js';
import { getCoordSession } from './coordAuth.js';

/* =========================== GUARD DE SESIÓN =========================== */
(function guard() {
  try {
    const params = new URLSearchParams(location.search);
    if (params.get('debug') === '1') return; // acceso libre en dev
    const user = getCoordSession();
    if (!user || String(user.perfil).toUpperCase() !== 'COORDINADOR') {
      window.location.assign('/coordinador/coordinador.html');
    }
  } catch {
    window.location.assign('/coordinador/coordinador.html');
  }
})();

/* =============================== DOM ================================== */
const $ = (s, c = document) => c.querySelector(s);

const gradoSel = $('#gradoSel');
const triSel   = $('#triSel');
const pubSel   = $('#pubSel');
const q        = $('#q');
const btnRecargar = $('#btnRecargar');

const kpiQA     = $('#kpiQA');
const kpiPROY   = $('#kpiPROY');
const kpiCLASES = $('#kpiCLASES');

const panel  = $('#panel');
const modal  = $('#modal');
const mTitle = $('#mTitle');
const mBody  = $('#mBody');
$('#mClose').addEventListener('click', () => modal.classList.remove('show'));

const btnQA     = $('#btnQA');
const btnPROY   = $('#btnPROY');
const btnCLASES = $('#btnCLASES');

/* ============================= CONSTANTES ============================= */
const GRADOS = Array.from({ length: 11 }, (_, i) => i + 1);
const TRIMESTRES = [1, 2, 3];

gradoSel.innerHTML = GRADOS.map(g => `<option value="${g}">${g}°</option>`).join('');
triSel.innerHTML   = TRIMESTRES.map(t => `<option value="${t}">${t}</option>`).join('');

/* ============================== HELPERS =============================== */
const escapeHtml = (s = '') =>
  s.replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));

const matchesText = (s, text) =>
  !text || (s || '').toLowerCase().includes(text);

function applyPubFilter(qb, pub) {
  if (pub === 'publicados') return qb.eq('publicado', true);
  if (pub === 'borradores') return qb.eq('publicado', false);
  return qb;
}

function getState() {
  return {
    grado: parseInt(gradoSel.value || '1', 10),
    tri:   parseInt(triSel.value   || '1', 10),
    pub:   pubSel.value, // 'todos' | 'publicados' | 'borradores'
    text:  (q.value || '').trim().toLowerCase()
  };
}

function showSBError(err) {
  const msg = err?.message || err?.hint || JSON.stringify(err);
  console.error('Supabase error:', err);
  alert('Operación bloqueada: ' + msg);
}

/* ======================== FETCH (con filtros) ========================= */
async function fetchQA(state) {
  let qb = supabase
    .from('que_aprender')
    .select('id, contenido, publicado, fecha_publicacion')
    .eq('grado', state.grado)
    .eq('trimestre', state.tri);
  qb = applyPubFilter(qb, state.pub);
  const { data, error } = await qb.order('id', { ascending: false });
  if (error) { console.error(error); return []; }
  return (data || []).filter(r => matchesText(r.contenido, state.text));
}

async function fetchPROY(state) {
  let qb = supabase
    .from('proyectos')
    .select('id, nombre, descripcion, publicado, fecha_publicacion, fecha_inicio, fecha_final')
    .eq('grado', state.grado)
    .eq('trimestre', state.tri);
  qb = applyPubFilter(qb, state.pub);
  const { data, error } = await qb.order('id', { ascending: false });
  if (error) { console.error(error); return []; }
  return (data || []).filter(r =>
    matchesText(r.nombre, state.text) || matchesText(r.descripcion, state.text)
  );
}

async function fetchCLASES(state) {
  let qb = supabase
    .from('clases')
    .select('id, numero_clase, nombre, descripcion, publicado, fecha_publicacion, fecha_ejecucion')
    .eq('grado', state.grado)
    .eq('trimestre', state.tri);
  qb = applyPubFilter(qb, state.pub);
  const { data, error } = await qb.order('numero_clase', { ascending: true });
  if (error) { console.error(error); return []; }
  return (data || []).filter(r =>
    matchesText(r.nombre, state.text) ||
    matchesText(r.descripcion, state.text) ||
    matchesText(String(r.numero_clase), state.text)
  );
}

/* =============================== KPIs ================================= */
async function loadKPIs() {
  const st = getState();
  const [qa, pr, cl] = await Promise.all([fetchQA(st), fetchPROY(st), fetchCLASES(st)]);
  kpiQA.textContent     = qa.length;
  kpiPROY.textContent   = pr.length;
  kpiCLASES.textContent = cl.length;
}

/* ============================== RENDERS =============================== */
let current = 'clases';

async function renderQASection() {
  current = 'qa';
  const st = getState();
  const items = await fetchQA(st);

  panel.innerHTML = `
    <section class="section">
      <div class="section__head">
        <h2 class="h">🧭 Qué vamos a aprender – ${st.grado}° · T${st.tri}</h2>
        <div class="badge">${items.length} elemento(s)</div>
      </div>
      <div class="list">
        ${items.map(q => `
          <div class="item" data-type="qa" data-id="${q.id}">
            <div class="item__meta">
              <span class="item__title">Contenido</span>
              ${q.publicado ? '<span class="badge">PUBLICADO</span>' : '<span class="badge badge--draft">BORRADOR</span>'}
              ${q.fecha_publicacion ? `<span class="badge">${new Date(q.fecha_publicacion).toLocaleDateString()}</span>` : ''}
            </div>
            <div class="item__actions">
              <button class="btn-ghost" data-action="preview">Previsualizar</button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

async function renderProySection() {
  current = 'proy';
  const st = getState();
  const items = await fetchPROY(st);

  panel.innerHTML = `
    <section class="section">
      <div class="section__head">
        <h2 class="h">🧩 Proyecto – ${st.grado}° · T${st.tri}</h2>
        <div class="badge">${items.length} proyecto(s)</div>
      </div>
      <div class="list">
        ${items.map(p => `
          <div class="item" data-type="proy" data-id="${p.id}">
            <div class="item__meta">
              <span class="item__title">${escapeHtml(p.nombre || 'Proyecto')}</span>
              <span class="item__desc">${escapeHtml(p.descripcion || '')}</span>
              ${p.publicado ? '<span class="badge">PUBLICADO</span>' : '<span class="badge badge--draft">BORRADOR</span>'}
              ${p.fecha_publicacion ? `<span class="badge">${new Date(p.fecha_publicacion).toLocaleDateString()}</span>` : ''}
            </div>
            <div class="item__actions">
              <button class="btn-ghost" data-action="preview">Previsualizar</button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

async function renderClasesSection() {
  current = 'clases';
  const st = getState();
  const items = await fetchCLASES(st);

  panel.innerHTML = `
    <section class="section">
      <div class="section__head">
        <h2 class="h">📚 Clases – ${st.grado}° · T${st.tri}</h2>
        <div class="badge">${items.length} clase(s)</div>
      </div>
      <div class="list">
        ${items.map(c => `
          <div class="item" data-type="clase" data-id="${c.id}">
            <div class="item__meta" title="Fecha ejecución: ${c.fecha_ejecucion || '—'}">
              <span class="item__title">Clase ${c.numero_clase} · ${escapeHtml(c.nombre || '')}</span>
              <span class="item__desc">${escapeHtml(c.descripcion || '')}</span>
              ${c.publicado ? '<span class="badge">PUBLICADA</span>' : '<span class="badge badge--draft">BORRADOR</span>'}
              ${c.fecha_publicacion ? `<span class="badge">${new Date(c.fecha_publicacion).toLocaleDateString()}</span>` : ''}
            </div>
            <div class="item__actions">
              <button class="btn-ghost" data-action="preview">Previsualizar</button>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderOpen() {
  if (current === 'qa')   return renderQASection();
  if (current === 'proy') return renderProySection();
  return renderClasesSection();
}

/* ============================ INTERACCIONES =========================== */
btnQA.addEventListener('click', renderQASection);
btnPROY.addEventListener('click', renderProySection);
btnCLASES.addEventListener('click', renderClasesSection);

btnRecargar.addEventListener('click', async () => { await loadKPIs(); await renderOpen(); });
[q, gradoSel, triSel, pubSel].forEach(el =>
  el.addEventListener('change', async () => { await loadKPIs(); await renderOpen(); })
);

// Acciones en cada item (solo preview)
panel.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="preview"]');
  if (!btn) return;
  const item = e.target.closest('.item');
  const id   = Number(item?.dataset?.id);
  const type = item?.dataset?.type;
  await previewItem(type, id);
});

/* ======================= PREVIEW & RECURSOS =========================== */
async function previewItem(type, id) {
  let title = '', html = '';

  if (type === 'qa') {
    const { data, error } = await supabase.from('que_aprender').select('*').eq('id', id).single();
    if (error) { showSBError(error); return; }
    title = 'Qué vamos a aprender';
    html  = data?.contenido || '<em>Sin contenido.</em>';
  } else if (type === 'proy') {
    const { data, error } = await supabase.from('proyectos').select('*').eq('id', id).single();
    if (error) { showSBError(error); return; }
    title = escapeHtml(data?.nombre || 'Proyecto');
    html  = `<p>${escapeHtml(data?.descripcion || '')}</p>`;
    if (data?.fecha_inicio || data?.fecha_final) {
      html += `<p><strong>Duración:</strong> ${data.fecha_inicio || '—'} → ${data.fecha_final || '—'}</p>`;
    }
  } else { // clase
    const { data, error } = await supabase.from('clases').select('*').eq('id', id).single();
    if (error) { showSBError(error); return; }
    title = `Clase ${data?.numero_clase} · ${escapeHtml(data?.nombre || '')}`;
    html  = `<p>${escapeHtml(data?.descripcion || '')}</p><div>${data?.contenido || ''}</div>`;
    html += await renderRecursosClase(id); // visor embebido
  }

  mTitle.textContent = title;
  mBody.innerHTML    = html || '<em>Sin contenido.</em>';
  modal.classList.add('show');

  // Delegación para abrir recursos dentro del modal
  mBody.addEventListener('click', onResItemClick);
}

function onResItemClick(e){
  const item = e.target.closest('.res-item');
  if(!item) return;
  const url  = item.dataset.url;
  renderViewer(url);
}

async function renderRecursosClase(claseId) {
  const { data, error } = await supabase
    .from('recursos')
    .select('*')
    .eq('clase_id', claseId)
    .order('id');

  if (error || !data?.length) return '';

  return `
    <hr/>
    <h4 class="h">Recursos</h4>
    <div class="res-wrap">
      <div class="res-list">
        ${data.map(r => `
          <div class="res-item" data-url="${r.url}">
            <span>${escapeHtml(r.nombre)}</span>
            <span class="badge">${(r.tipo_recurso || 'RECURSO').toUpperCase()}</span>
          </div>
        `).join('')}
      </div>
      <div class="viewer" id="resViewer"><div class="viewer__hint">Selecciona un recurso para previsualizarlo aquí.</div></div>
    </div>
  `;
}

function renderViewer(url){
  const v = $('#resViewer', mBody);
  if(!v) return;

  const lower = (url||'').toLowerCase();
  const isYouTube = /youtube\.com\/watch\?v=|youtu\.be\//.test(lower);
  const isPDF  = /\.pdf(\?|$)/.test(lower);
  const isImg  = /\.(png|jpe?g|gif|webp|svg)(\?|$)/.test(lower);
  const isVid  = /\.(mp4|webm|ogg)(\?|$)/.test(lower);
  const isAud  = /\.(mp3|wav|ogg|m4a)(\?|$)/.test(lower);

  let html = '';
  if(isYouTube){
    const id = getYouTubeId(url);
    html = id ? `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>` :
                `<iframe src="${url}" allowfullscreen></iframe>`;
  }else if(isPDF){
    html = `<iframe src="${url}#view=FitH"></iframe>`;
  }else if(isImg){
    html = `<img src="${url}" alt="Recurso" />`;
  }else if(isVid){
    html = `<video src="${url}" controls></video>`;
  }else if(isAud){
    html = `<audio src="${url}" controls></audio>`;
  }else{
    // Intento genérico con iframe (puede bloquearse por X-Frame-Options del host)
    html = `<iframe src="${url}"></iframe>`;
  }
  v.innerHTML = html;
}

function getYouTubeId(u){
  try{
    const url = new URL(u);
    if(url.hostname.includes('youtu.be')) return url.pathname.slice(1);
    if(url.hostname.includes('youtube.com')) return url.searchParams.get('v');
    return null;
  }catch{ return null; }
}

/* ============================== REALTIME ============================== */
try {
  const channel = supabase.channel('coord-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clases' },       async () => { await loadKPIs(); await renderOpen(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'proyectos' },    async () => { await loadKPIs(); await renderOpen(); })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'que_aprender' }, async () => { await loadKPIs(); await renderOpen(); })
    .subscribe();
  window.__coordRealtime__ = channel;
} catch (e) {
  console.warn('Realtime no disponible:', e?.message || e);
}

/* ============================== INIT ================================ */
async function init() {
  await loadKPIs();
  await renderClasesSection(); // sección por defecto
}
init();
