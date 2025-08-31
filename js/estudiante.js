/* html/estudiante.js — Dashboard Estudiante robusto */
(() => {
  const SUPABASE_URL = 'https://trfiejowmfgzudhsdpdx.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZmllam93bWZnenVkaHNkcGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MjM2MjksImV4cCI6MjA3MTk5OTYyOX0.SCNuSO9uKtaKfGBSi3WMIpvNFmsE66aRROJEgTUrx34';
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const LS_KEY = 'sdcs_user';
  const ROUTE_LOGIN = '/html/acceso.html';
  const params = new URLSearchParams(location.search);
  const DEBUG = params.get('debug') === '1';

  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => [...c.querySelectorAll(s)];

  const trimestres = $('#trimestres');
  const chipsRow   = $('#chipsRow');
  const view       = $('#view');
  const viewTitle  = $('#viewTitle');
  const recs       = $('#recursos');
  const modal  = $('#modal'); const mBody  = $('#mBody'); const mTitle = $('#mTitle');
  $('#mClose')?.addEventListener('click', ()=> modal?.classList.remove('show'));

  const gradoSel = $('#gradoSel');
  const rowTop   = $('#rowTop'); const gradoWrap = $('#gradoWrap');

  const esc = (s='') => s.replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function limpiarVista(){ if (view) view.innerHTML=''; if (viewTitle) viewTitle.textContent='Vista'; if (recs) recs.innerHTML=''; }

  function getUser(){ try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { return null; } }
  let detectedGrade = null;

  // --- NUEVO: asegurar grado siempre
  function ensureGradeFallback() {
    // 1) ?grado=... en la URL
    const qp = params.get('grado');
    if (qp && !Number.isNaN(parseInt(qp,10))) { detectedGrade = parseInt(qp,10); return; }
    // 2) por defecto, grado 1
    detectedGrade = 1;
  }

  function requireAuth() {
    if (DEBUG) {
      detectedGrade = parseInt(params.get('grado') || '1', 10);
      return { perfil: 'estudiante', grado: detectedGrade };
    }
    const u = getUser();
    if (!u || !u.perfil) {
      // si viene ?grado, permitimos vista directa (útil en pruebas controladas)
      const qp = params.get('grado');
      if (qp && !Number.isNaN(parseInt(qp,10))) {
        detectedGrade = parseInt(qp,10);
        return { perfil: 'estudiante', grado: detectedGrade };
      }
      location.href = ROUTE_LOGIN; return null;
    }
    detectedGrade = Number(u.grado ?? u.grado_id ?? u.grade ?? NaN);
    if (Number.isNaN(detectedGrade)) ensureGradeFallback();
    return u;
  }

  const currentGrade = () => {
    if (DEBUG) return parseInt(gradoSel?.value || detectedGrade || 1, 10);
    if (detectedGrade == null || Number.isNaN(Number(detectedGrade))) ensureGradeFallback();
    return Number(detectedGrade);
  };
  const currentTrim  = () => parseInt($('.chip-act', trimestres)?.dataset.tri || '1', 10);

  const TABLES = {
    qa:       ['que_aprender', 'que_vamos_aprender', 'que_aprenderz'],
    proyecto: ['proyectos', 'proyecto'],
    clases:   ['clases', 'clase', 'clases_publicadas'],
    r_clase:  ['recursos_clase', 'clase_recursos', 'recursos'],
    r_qa:     ['recursos_qa', 'qa_recursos', 'recursos'],
    r_proy:   ['recursos_proyecto', 'proyecto_recursos', 'recursos'],
  };

  const KEYSETS = {
    grade:     ['grado','grado_id','id_grado','curso','nivel'],
    term:      ['trimestre','periodo','term','bimestre'],
    published: ['publicado','visible','is_public','publica','published'],
    number:    ['numero_clase','numero','nro','orden','clase'],
    title:     ['nombre','titulo','title'],
    content:   ['contenido','html','cuerpo'],
    fk_clase:  ['clase_id','id_clase','fk_clase'],
    fk_qa:     ['qa_id','id_qa','fk_qa'],
    fk_proy:   ['proyecto_id','id_proyecto','fk_proyecto'],
  };

  function pickKey(obj, candidates, includes=[]) {
    const keys = Object.keys(obj||{}).map(k=>k.toLowerCase());
    for (const c of candidates) {
      const i = keys.indexOf(c.toLowerCase());
      if (i !== -1) return Object.keys(obj)[i];
    }
    for (const inc of includes) {
      const k = keys.find(kk => kk.includes(inc.toLowerCase()));
      if (k) return Object.keys(obj)[keys.indexOf(k)];
    }
    return null;
  }
  const truthy = v => v===true || v===1 || v==='1' || String(v).toLowerCase()==='true' || v==='t' || v==='on';

  async function tableExists(name) {
    try { const r = await supabase.from(name).select('id').limit(1); return !r.error; }
    catch { return false; }
  }
  async function pickTable(list) { for (const t of list) { if (await tableExists(t)) return t; } return null; }
  async function loadAll(table) {
    try { const r = await supabase.from(table).select('*'); return r.error ? [] : (r.data||[]); }
    catch { return []; }
  }

  function filterRows(rows, g, t) {
    if (!rows.length) return [];
    const sample = rows[0];
    const kGrade = pickKey(sample, KEYSETS.grade, ['grado','curso','nivel']);
    const kTerm  = pickKey(sample, KEYSETS.term,  ['trimestre','periodo','term','bimestre']);
    const kPub   = pickKey(sample, KEYSETS.published, ['public']);
    let out = rows.slice();
    if (kGrade) out = out.filter(r => Number(r[kGrade]) === Number(g));
    if (kTerm)  out = out.filter(r => Number(r[kTerm])  === Number(t));
    if (kPub)   out = out.filter(r => truthy(r[kPub]));
    return out;
  }
  function sortClasses(rows) {
    if (!rows.length) return rows;
    const s = rows[0];
    const kNum = pickKey(s, KEYSETS.number, ['numero','orden','clase']);
    const kId  = pickKey(s, ['id']);
    const key  = kNum || kId;
    return key ? rows.sort((a,b)=> (a[key]??0) - (b[key]??0)) : rows;
  }
  function numClase(c) {
    const kNum = pickKey(c, KEYSETS.number, ['numero','orden','clase']);
    return c?.[kNum] ?? '?';
  }
  function nomClase(c) {
    const kTit = pickKey(c, KEYSETS.title, ['nombre','titulo','title']);
    return c?.[kTit] ?? `Clase ${numClase(c)}`;
  }

  (function init(){
    if (!requireAuth()) return;

    if (DEBUG) {
      rowTop?.classList.add('debug'); gradoWrap?.classList.remove('hide');
      if (gradoSel) {
        gradoSel.innerHTML = Array.from({length:11},(_,i)=>i+1).map(g=>`<option value="${g}">${g}°</option>`).join('');
        gradoSel.value = String(detectedGrade || 1);
        gradoSel.addEventListener('change', recargar);
      }
    } else {
      rowTop?.classList.remove('debug'); gradoWrap?.classList.add('hide');
    }

    trimestres?.addEventListener('click',(e)=>{
      const b = e.target.closest('[data-tri]'); if(!b) return;
      $$('.chip-tri', trimestres).forEach(x=>x.classList.remove('chip-act'));
      b.classList.add('chip-act'); recargar();
    });

    // tooltips y clicks
    let tipEl=null;
    chipsRow?.addEventListener('mousemove',(e)=>{
      const ch = e.target.closest('[data-tip]');
      if(!ch){ tipEl?.remove(); tipEl=null; return; }
      if(!tipEl){ tipEl=document.createElement('div'); tipEl.className='tooltip'; document.body.appendChild(tipEl); }
      tipEl.textContent = ch.dataset.tip || '';
      const r = ch.getBoundingClientRect();
      tipEl.style.left = (r.left + r.width/2) + 'px';
      tipEl.style.top  = (r.top - 10) + 'px';
    });
    chipsRow?.addEventListener('mouseleave', ()=>{ tipEl?.remove(); tipEl=null; });
    chipsRow?.addEventListener('click',(e)=>{
      const qa = e.target.closest('[data-qa]');   if (qa){ cargarQA(); return; }
      const pr = e.target.closest('[data-proy]'); if (pr){ cargarProyecto(); return; }
      const cl = e.target.closest('[data-id]');   if (cl){ verClase(parseInt(cl.dataset.id,10)); return; }
    });

    recargar();
  })();

  async function recargar(){
    limpiarVista();
    if (chipsRow) chipsRow.innerHTML = '<div class="p">Cargando…</div>';

    const g = currentGrade(); const t = currentTrim();

    const tblQA  = await pickTable(TABLES.qa);
    const tblPr  = await pickTable(TABLES.proyecto);
    const tblCls = await pickTable(TABLES.clases);

    const qaAll  = tblQA  ? await loadAll(tblQA)  : [];
    const prAll  = tblPr  ? await loadAll(tblPr)  : [];
    const clAll  = tblCls ? await loadAll(tblCls) : [];

    const qa     = filterRows(qaAll, g, t)[0];
    const proy   = filterRows(prAll, g, t)[0];
    const clases = sortClasses(filterRows(clAll, g, t));

    const chips = [];
    chips.push(`<button class="chip-qa" data-qa="1" data-tip="${qa ? 'Qué vamos a aprender · publicado' : 'Qué vamos a aprender · sin publicación'}">Qué vamos a aprender</button>`);
    chips.push(`<button class="chip-proy" data-proy="1" data-tip="${proy ? esc(proy?.nombre || proy?.titulo || 'Proyecto') : 'Proyecto · sin publicación'}">Proyecto</button>`);

    if (!clases.length) {
      chips.push(`<span class="p">Sin clases publicadas para ${g}° – Trimestre ${t}.</span>`);
    } else {
      for (const c of clases) {
        const tip = `Clase ${numClase(c)} · ${esc(nomClase(c))}`;
        chips.push(`<button class="clase-chip" data-id="${c.id}" data-tip="${tip}">Clase ${numClase(c)}</button>`);
      }
    }
    if (chipsRow) chipsRow.innerHTML = chips.join('');
  }

  async function verClase(id){
    const tblCls = await pickTable(TABLES.clases);
    if (!tblCls) return;

    const r = await supabase.from(tblCls).select('*').eq('id', id).single();
    if (r.error) { console.error(r.error); return; }

    const c = r.data;
    if (viewTitle) viewTitle.textContent = `Clase ${numClase(c)} · ${nomClase(c)}`;
    const kContent = pickKey(c, KEYSETS.content, ['contenido','html','cuerpo']);
    if (view) view.innerHTML = c?.[kContent] || '<div class="p">Sin contenido.</div>';

    const tblRes = await pickTable(TABLES.r_clase);
    if (!tblRes) { if (recs) recs.innerHTML = '<div class="p">Sin recursos.</div>'; return; }

    const rsAll = (await supabase.from(tblRes).select('*')).data || [];
    const sample = rsAll[0] || {};
    const fk = pickKey(sample, KEYSETS.fk_clase, ['clase']);
    const rs = fk ? rsAll.filter(x => Number(x[fk]) === Number(id)) : [];
    renderRecursos(rs);
  }

  async function cargarQA(){
    limpiarVista(); if (viewTitle) viewTitle.textContent = 'Qué vamos a aprender';
    const tblQA = await pickTable(TABLES.qa);
    if (!tblQA) { if (view) view.innerHTML = '<div class="p">Sin contenido.</div>'; return; }

    const qa = filterRows((await loadAll(tblQA)), currentGrade(), currentTrim())[0];
    if (!qa){ if (view) view.innerHTML = '<div class="p">Sin contenido publicado.</div>'; if (recs) recs.innerHTML=''; return; }

    const kContent = pickKey(qa, KEYSETS.content, ['contenido','html','cuerpo']);
    if (view) view.innerHTML = qa?.[kContent] || '<div class="p">Sin contenido.</div>';

    const tblRes = await pickTable(TABLES.r_qa);
    if (!tblRes) { if (recs) recs.innerHTML = '<div class="p">Sin recursos.</div>'; return; }

    const rsAll = (await supabase.from(tblRes).select('*')).data || [];
    const sample = rsAll[0] || {};
    const fk = pickKey(sample, KEYSETS.fk_qa, ['qa']);
    const rs = fk ? rsAll.filter(x => Number(x[fk]) === Number(qa.id)) : [];
    renderRecursos(rs);
  }

  async function cargarProyecto(){
    limpiarVista(); if (viewTitle) viewTitle.textContent = 'Proyecto del trimestre';
    const tblPr = await pickTable(TABLES.proyecto);
    if (!tblPr) { if (view) view.innerHTML = '<div class="p">Sin proyecto.</div>'; return; }

    const p = filterRows((await loadAll(tblPr)), currentGrade(), currentTrim())[0];
    if (!p){ if (view) view.innerHTML = '<div class="p">Sin proyecto publicado.</div>'; if (recs) recs.innerHTML=''; return; }

    const kTit = pickKey(p, KEYSETS.title, ['nombre','titulo']);
    if (view) view.innerHTML = `<h3>${esc(p?.[kTit] || 'Proyecto')}</h3><p>${esc(p.descripcion || '')}</p>`;

    const tblRes = await pickTable(TABLES.r_proy);
    if (!tblRes) { if (recs) recs.innerHTML = '<div class="p">Sin recursos.</div>'; return; }

    const rsAll = (await supabase.from(tblRes).select('*')).data || [];
    const sample = rsAll[0] || {};
    const fk = pickKey(sample, KEYSETS.fk_proy, ['proyecto']);
    const rs = fk ? rsAll.filter(x => Number(x[fk]) === Number(p.id)) : [];
    renderRecursos(rs);
  }

  function renderRecursos(arr){
    if (!recs) return;
    if (!arr.length){ recs.innerHTML='<div class="p">Sin recursos.</div>'; return; }
    recs.innerHTML = arr.map(r=>{
      const tipo = (r.tipo_recurso || r.tipo || '').toString().toLowerCase();
      const nombre = r.nombre || r.titulo || 'Recurso';
      const url = r.url || r.enlace || r.link || '';
      return `
      <div class="card-rec" data-tipo="${tipo}" data-url="${esc(url)}" data-nombre="${esc(nombre)}">
        <strong>${icono(tipo)} ${esc(nombre)}</strong>
        <span class="etq">${(tipo||'').toUpperCase()}</span>
      </div>`;
    }).join('');
    $$('.card-rec', recs).forEach(c=>{
      c.addEventListener('click', ()=> openViewer({ tipo:c.dataset.tipo, url:c.dataset.url, nombre:c.dataset.nombre }));
    });
  }
  function icono(tipo=''){
    const t = String(tipo).toLowerCase();
    if (t==='pdf') return '📄';
    if (t==='img' || t==='imagen' || t==='image') return '🖼️';
    if (t==='audio') return '🎧';
    if (t==='video') return '🎬';
    return '🔗';
  }
  function openViewer({ tipo, url, nombre }){
    if (!modal || !mBody || !mTitle) return;
    mTitle.textContent = nombre || 'Recurso';
    mBody.innerHTML = '';
    const lower = (url||'').toLowerCase();
    const yt = toYouTubeEmbed(url);
    if (yt){ mBody.innerHTML = `<iframe src="${yt}" allowfullscreen></iframe>`; modal.classList.add('show'); return; }
    if (tipo==='pdf' || lower.endsWith('.pdf')){ mBody.innerHTML = `<iframe src="${url}#toolbar=1&navpanes=0&scrollbar=1"></iframe>`; modal.classList.add('show'); return; }
    if (tipo==='img' || lower.match(/\.(png|jpe?g|gif|webp)$/)){ mBody.innerHTML = `<img class="viewer" src="${url}" alt="${esc(nombre)}">`; modal.classList.add('show'); return; }
    if (tipo==='audio' || lower.match(/\.(mp3|wav|ogg)$/)){ mBody.innerHTML = `<audio controls src="${url}"></audio>`; modal.classList.add('show'); return; }
    if (tipo==='video' || lower.match(/\.(mp4|webm|ogg)$/)){ mBody.innerHTML = `<video controls src="${url}"></video>`; modal.classList.add('show'); return; }
    mBody.innerHTML = `<iframe src="${url}"></iframe>
      <div class="p" style="padding:8px 12px">Si el sitio no permite embeber,
        <a href="${url}" target="_blank" rel="noopener">ábrelo en una pestaña nueva</a>.
      </div>`;
    modal.classList.add('show');
  }
  function toYouTubeEmbed(u=''){
    try{
      const url = new URL(u);
      if (/youtu\.be$/.test(url.hostname)){ const id = url.pathname.replace('/',''); return `https://www.youtube.com/embed/${id}`; }
      if (url.hostname.includes('youtube.com')){ const id = url.searchParams.get('v'); if (id) return `https://www.youtube.com/embed/${id}`; }
      return null;
    } catch { return null; }
  }
})();
