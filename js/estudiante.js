// js/estudiante.js
import { getSupabase } from './supabaseClient.js';

/* ================= DOM ================= */
const $  = (q)=>document.querySelector(q);
const $$ = (q)=>document.querySelectorAll(q);

const chipsRow   = $('#chipsRow');
const view       = $('#view');
const recursosEl = $('#recursos');

const triWrap    = $('#trimestres');
const gradoWrap  = $('#gradoWrap');
const gradoSel   = $('#gradoSel');

const modal      = $('#modal');
const mTitle     = $('#mTitle');
const mBody      = $('#mBody');
const mClose     = $('#mClose');

/* =============== SESIÓN (de Acceso) =============== */
function getSesion(){
  try { return JSON.parse(sessionStorage.getItem('sdcs_sesion') || 'null'); }
  catch { return null; }
}
function setSesionGrade(gr){
  const s = getSesion() || {};
  s.grado = Number(gr);
  sessionStorage.setItem('sdcs_sesion', JSON.stringify(s));
  return s.grado;
}
function getGrado(){
  const s = getSesion();
  return s?.grado ? Number(s.grado) : null;
}

/* =============== ESTADO =============== */
let sb = null;
let tri = 1;
let grado = null;

/* =============== INIT =============== */
init().catch(console.error);

async function init(){
  // Supabase
  try{
    sb = getSupabase();
  }catch(e){
    warn('Supabase: faltan credenciales o la librería supabase-js.');
    console.error('Error: Supabase no inicializado.', e);
    return;
  }

  // Botones de trimestres (arriba derecha)
  triWrap.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('[data-tri]');
    if(!btn) return;
    tri = Number(btn.dataset.tri || 1);
    $$('.chip-tri').forEach(b=>b.classList.remove('chip-act'));
    btn.classList.add('chip-act');
    cargar();
  });

  // Grado desde sesión o selector si no hay / debug
  grado = getGrado();
  const debug = new URLSearchParams(location.search).get('debug') === '1';

  // Inyectamos badge "Grado X°" a la izquierda sin tocar el HTML
  const gradoInfo = document.createElement('div');
  gradoInfo.id = 'gradoInfo';
  $('#rowTop').prepend(gradoInfo);

  if(!grado || debug){
    gradoWrap.classList.remove('hide');
    gradoSel.innerHTML = '<option value="">Grado…</option>' +
      Array.from({length:11},(_,i)=>`<option value="${i+1}">${i+1}°</option>`).join('');
    if(grado) gradoSel.value = String(grado);
    gradoSel.addEventListener('change', ()=>{
      const g = Number(gradoSel.value);
      if(!g) return;
      setSesionGrade(g);
      grado = g;
      updateGradeBadge(gradoInfo, grado);
      cargar();
    });
    if(grado){ updateGradeBadge(gradoInfo, grado); await cargar(); }
  }else{
    updateGradeBadge(gradoInfo, grado);
    await cargar();
  }

  // Modal
  mClose.addEventListener('click', cerrarModal);
  modal.addEventListener('click', (e)=>{ if(e.target===modal) cerrarModal(); });
}

function updateGradeBadge(node, g){
  node.textContent = `Grado ${g}°`;
}

/* =============== CARGA PRINCIPAL =============== */
async function cargar(){
  chipsRow.innerHTML = '<div class="p">Cargando…</div>';
  view.innerHTML      = '';
  recursosEl.innerHTML= '';

  if(!grado){
    msg('Falta el grado del estudiante en la sesión.', 'warn');
    return;
  }

  try{
    const [qa, proyecto, clases] = await Promise.all([
      qPublicados('que_aprender', grado, tri, { one:true }),
      qPublicados('proyectos', grado, tri, { one:true }),
      qPublicados('clases', grado, tri, { order:['numero_clase','asc'] })
    ]);

    renderChips(qa, proyecto, clases);

    // Vista inicial
    if(qa)         renderContenido('qa', qa);
    else if(proyecto) renderContenido('proyecto', proyecto);
    else if(clases && clases.length) renderContenido('clase', clases[0]);
    else{
      chipsRow.innerHTML = '<div class="msg warn">No hay contenido publicado para este grado y trimestre.</div>';
      view.innerHTML = '';
      recursosEl.innerHTML = '';
    }
  }catch(e){
    console.error(e);
    chipsRow.innerHTML = '<div class="msg err">Error al cargar contenido.</div>';
  }
}

/* =============== CONSULTAS =============== */
async function qPublicados(tabla, grado, tri, opt={}){
  const { one=false, order=null } = opt;

  // intento con "publicado"
  try{
    let q = sb.from(tabla).select('*').eq('grado', grado).eq('trimestre', tri).eq('publicado', true);
    if(order) q = q.order(order[0], { ascending: order[1] !== 'desc' });
    if(one)   q = q.limit(1);
    const { data, error } = await q;
    if(error) throw error;
    return one ? (data?.[0] ?? null) : (data ?? []);
  }catch(_){
    // intento sin "publicado"
    let q = sb.from(tabla).select('*').eq('grado', grado).eq('trimestre', tri);
    if(order) q = q.order(order[0], { ascending: order[1] !== 'desc' });
    if(one)   q = q.limit(1);
    const { data, error } = await q;
    if(error) throw error;
    return one ? (data?.[0] ?? null) : (data ?? []);
  }
}

/* =============== RENDER =============== */
function renderChips(qa, proyecto, clases){
  const items = [];
  if(qa)       items.push({ k:'qa',       t:'Qué vamos a aprender', item:qa });
  if(proyecto) items.push({ k:'proyecto', t:'Proyecto', item:proyecto });
  (clases||[]).forEach((c,ix)=>{
    const n = c?.numero_clase ?? (ix+1);
    items.push({ k:'clase', t:`Clase ${n}`, item:c });
  });

  if(!items.length){
    chipsRow.innerHTML = '<div class="msg warn">No hay datos disponibles.</div>';
    return;
  }

  chipsRow.innerHTML = items.map((it,idx)=>{
    const tip = buildTooltip(it.item);
    return `<div class="chip-item" data-k="${it.k}" data-idx="${idx}"
              title="${escapeHtml(tip).replace(/\n/g,'&#10;')}">${escapeHtml(it.t)}</div>`;
  }).join('');

  chipsRow.onclick = (e)=>{
    const el = e.target.closest('.chip-item'); if(!el) return;
    const k = el.dataset.k, idx = Number(el.dataset.idx);
    const target = items[idx];
    renderContenido(k, target.item);
  };
}

function buildTooltip(row){
  const t = row?.titulo || row?.nombre || '';
  const d = row?.descripcion || row?.descripcion_corta || row?.detalle || '';
  const f = row?.fecha || row?.fecha_ejecucion || row?.created_at || row?.updated_at || '';
  const dShort = String(d||'').trim().slice(0,140) + (d && d.length>140 ? '…' : '');
  const lines = [];
  if(t) lines.push(`Título: ${t}`);
  if(dShort) lines.push(`Descripción: ${dShort}`);
  if(f) lines.push(`Fecha: ${f}`);
  return lines.join('\n');
}

function renderContenido(tipo, data){
  recursosEl.innerHTML = '';

  const titulo = data?.titulo || data?.nombre || (tipo==='qa'?'Qué vamos a aprender': (tipo==='proyecto'?'Proyecto':'Clase'));
  const desc   = data?.descripcion || data?.descripcion_corta || data?.detalle || '';
  const fecha  = data?.fecha || data?.fecha_ejecucion || data?.created_at || data?.updated_at || '';

  view.innerHTML = `
    <h3>${escapeHtml(String(titulo))}</h3>
    ${desc ? `<p class="lead">${escapeHtml(String(desc))}</p>` : ''}
    ${fecha ? `<div class="meta">Fecha: ${escapeHtml(String(fecha))}</div>` : ''}
    ${data?.contenido || data?.texto ? `<div>${data.contenido || data.texto}</div>` : ''}
  `;

  const id = data?.id;
  if(!id){ return; }

  cargarRecursosRelacionado(id, tipo)
    .then(rs => {
      if(!rs || rs.length===0){
        recursosEl.innerHTML = '<div class="msg warn">Sin recursos asociados.</div>';
        return;
      }
      recursosEl.innerHTML = rs.map(r => (
        `<div class="rec" data-url="${encodeURIComponent(r.url||'')}" data-n="${encodeURIComponent(r.nombre||'Recurso')}" data-t="${encodeURIComponent(r.tipo_recurso||'')}">
           ${escapeHtml(r.nombre || 'Recurso')}
         </div>`
      )).join('');

      recursosEl.onclick = (e)=>{
        const el = e.target.closest('.rec'); if(!el) return;
        const url = decodeURIComponent(el.dataset.url||'');
        const nombre = decodeURIComponent(el.dataset.n||'Recurso');
        const tipo = decodeURIComponent(el.dataset.t||'');
        abrirRecurso(nombre, url, tipo);
      };
    })
    .catch(err=>{
      console.error('Recursos error:', err);
      recursosEl.innerHTML = '<div class="msg err">Error cargando recursos.</div>';
    });
}

/* ===== Recursos: prueba múltiples posibles FKs ===== */
async function cargarRecursosRelacionado(id, tipo){
  const candidates = [
    `${tipo}_id`,                // clase_id, proyecto_id, qa_id
    'clase_id', 'proyecto_id', 'qa_id', 'contenido_id'
  ];

  for(const col of candidates){
    try{
      const { data, error } = await sb.from('recursos').select('*').eq(col, id);
      if(error) throw error;
      if(data && data.length) return data;
    }catch{ /* prueba siguiente columna */ }
  }
  // Fallback: recursos por grado/trimestre si existen
  try{
    const { data, error } = await sb.from('recursos').select('*').eq('grado', grado).eq('trimestre', tri);
    if(error) throw error;
    return data || [];
  }catch{ return []; }
}

/* ====== Visor de recursos ====== */
function abrirRecurso(nombre, url, tipo){
  mTitle.textContent = nombre || 'Recurso';
  mBody.innerHTML = renderEmbed(url, tipo);
  modal.classList.add('modal--open');
}
function cerrarModal(){ modal.classList.remove('modal--open'); mBody.innerHTML=''; }

function renderEmbed(url, tipo){
  const u = String(url||'');
  const isPdf  = /\.pdf(\?|$)/i.test(u) || tipo==='pdf';
  const isImg  = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(u) || tipo==='img';
  const isYt   = /youtube\.com\/watch\?v=|youtu\.be\//i.test(u);

  if(isPdf){
    return `<iframe src="${u}#view=fitH" allow="fullscreen"></iframe>`;
  }
  if(isImg){
    return `<img src="${u}" alt="">`;
  }
  if(isYt){
    const id = u.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1] || '';
    if(id) return `<iframe src="https://www.youtube.com/embed/${id}" allowfullscreen></iframe>`;
  }
  return `<iframe src="${u}" allow="fullscreen"></iframe>`;
}

/* ====== Utils ====== */
function msg(text, kind='err'){
  chipsRow.innerHTML = `<div class="msg ${kind}">${escapeHtml(text)}</div>`;
}
function warn(text){ msg(text,'warn'); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'}[c])); }
