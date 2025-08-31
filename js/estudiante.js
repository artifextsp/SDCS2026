// js/estudiante.js
// Dashboard Estudiante: SIEMPRE filtra por (grado, trimestre, publicado=true)

import { supabase, getGradoActual } from "../js/supabaseClient.js";

const ui = {
  chipsRow:   document.getElementById("chipsRow"),
  view:       document.getElementById("view"),
  viewTitle:  document.getElementById("viewTitle"),
  recursos:   document.getElementById("recursos"),
  triBtns:    [...document.querySelectorAll(".chip-tri, [data-tri]")], // Trimestre 1/2/3
  avisoCont:  document.querySelector('[data-aviso="contenido"]') || null, // opcional
};

const estado = {
  grado: null,
  tri:   1,
};

init().catch(console.error);

async function init() {
  // 1) Verifica sesión (grado)
  const grado = getGradoActual();
  if (!Number.isFinite(grado)) {
    // sin sesión → acceso
    window.location.href = "./acceso.html?e=nosession";
    return;
  }
  estado.grado = Number(grado);

  // 2) Trimestre UI
  bindTrimestres();

  // 3) Cargar la tira de chips por primera vez
  await cargarChips();
}

// Manejo de trimestres
function bindTrimestres() {
  ui.triBtns.forEach((b) => {
    b.addEventListener("click", async (e) => {
      const tri = Number(e.currentTarget.dataset.tri || 1);
      estado.tri = tri;
      ui.triBtns.forEach(x => x.classList.toggle("chip-act", x === e.currentTarget));
      await cargarChips();
    });
  });
}

function setLoading(msg = "Cargando…") {
  ui.chipsRow.innerHTML = `<div class="p">${msg}</div>`;
  ui.view.innerHTML = "";
  ui.recursos.innerHTML = "";
  ui.viewTitle.textContent = "Vista";
}

// Construye una “chip” (botón)
function chip(html, attrs = {}) {
  const btn = document.createElement("button");
  btn.className = "chip";
  btn.innerHTML = html;
  Object.entries(attrs).forEach(([k, v]) => btn.setAttribute(k, v));
  return btn;
}

// =================== CARGA DE LISTAS ===================

async function cargarChips() {
  setLoading();

  const { grado, tri } = estado;

  // Qué vamos a aprender
  const qaP = supabase
    .from("que_aprender")
    .select("id, contenido")
    .eq("grado", grado)
    .eq("trimestre", tri)
    .eq("publicado", true)
    .order("id", { ascending: false })
    .limit(1)
    .throwOnError();

  // Proyecto del trimestre
  const prP = supabase
    .from("proyectos")
    .select("id, nombre, descripcion, fecha_inicio, fecha_final")
    .eq("grado", grado)
    .eq("trimestre", tri)
    .eq("publicado", true)
    .order("id", { ascending: false })
    .limit(1)
    .throwOnError();

  // Clases
  const clP = supabase
    .from("clases")
    .select("id, numero_clase, nombre, descripcion, fecha_ejecucion")
    .eq("grado", grado)
    .eq("trimestre", tri)
    .eq("publicado", true)
    .order("numero_clase", { ascending: true })
    .throwOnError();

  const [{ data: qa }, { data: proyecto }, { data: clases }] = await Promise.all([qaP, prP, clP]);

  const frag = document.createDocumentFragment();

  // Chips QA + Proyecto primero
  if (qa && qa.length) {
    const btnQA = chip(`🕑 Qué vamos a aprender`, { "data-kind": "qa", "data-id": qa[0].id });
    btnQA.addEventListener("click", () => verQA(qa[0].id));
    frag.appendChild(btnQA);
  }
  if (proyecto && proyecto.length) {
    const p = proyecto[0];
    const btnP = chip(`🧪 Proyecto`, { "data-kind": "proy", "data-id": p.id });
    btnP.addEventListener("click", () => verProyecto(p.id));
    frag.appendChild(btnP);
  }

  // Chips de clases (Clase 1, Clase 2…)
  if (clases && clases.length) {
    clases.forEach((c) => {
      const btn = chip(`Clase ${c.numero_clase}`, {
        "data-kind": "clase",
        "data-id": String(c.id),
        title: `${c.nombre || ""}`.trim(),
      });
      btn.addEventListener("click", () => verClase(c.id));
      frag.appendChild(btn);
    });
  }

  ui.chipsRow.innerHTML = "";
  if (!frag.children.length) {
    ui.chipsRow.innerHTML = `<div class="p">No hay contenido publicado para este grado y trimestre.</div>`;
    return;
  }
  ui.chipsRow.appendChild(frag);
}

// =================== VISTAS DETALLE ===================

async function verQA(id) {
  ui.viewTitle.textContent = "Qué vamos a aprender";
  ui.view.innerHTML = "Cargando…";
  ui.recursos.innerHTML = "";

  const { data, error } = await supabase
    .from("que_aprender").select("contenido").eq("id", id).single();

  if (error || !data) {
    ui.view.innerHTML = `<div class="p">No se pudo cargar el contenido.</div>`;
    return;
  }
  ui.view.innerHTML = sanitizeHtml(data.contenido || "");
}

async function verProyecto(id) {
  ui.viewTitle.textContent = "Proyecto del trimestre";
  ui.view.innerHTML = "Cargando…";
  ui.recursos.innerHTML = "";

  const { data, error } = await supabase
    .from("proyectos")
    .select("nombre, descripcion, fecha_inicio, fecha_final")
    .eq("id", id).single();

  if (error || !data) {
    ui.view.innerHTML = `<div class="p">No se pudo cargar el proyecto.</div>`;
    return;
  }
  const parts = [];
  parts.push(`<h3 class="h h-azul-3">${escapeHtml(data.nombre || "Proyecto")}</h3>`);
  if (data.descripcion) parts.push(`<div class="p">${sanitizeHtml(data.descripcion)}</div>`);
  if (data.fecha_inicio || data.fecha_final) {
    parts.push(`<div class="p"><small>${fmtFecha(data.fecha_inicio)} – ${fmtFecha(data.fecha_final)}</small></div>`);
  }
  ui.view.innerHTML = parts.join("\n");
}

async function verClase(id) {
  ui.viewTitle.textContent = "Clase";
  ui.view.innerHTML = "Cargando…";
  ui.recursos.innerHTML = "";

  const [cRes, rRes] = await Promise.all([
    supabase.from("clases")
      .select("nombre, descripcion, fecha_ejecucion, contenido")
      .eq("id", id).single(),
    supabase.from("recursos")
      .select("id, tipo_recurso, nombre, url, fecha_subida")
      .eq("clase_id", id)
      .order("fecha_subida", { ascending: false }),
  ]);

  const clase = cRes.data;
  if (cRes.error || !clase) {
    ui.view.innerHTML = `<div class="p">No se pudo cargar la clase.</div>`;
    return;
  }

  const parts = [];
  parts.push(`<h3 class="h h-azul-3">${escapeHtml(clase.nombre || "Clase")}</h3>`);
  if (clase.descripcion) parts.push(`<div class="p">${sanitizeHtml(clase.descripcion)}</div>`);
  if (clase.fecha_ejecucion) parts.push(`<div class="p"><small>${fmtFecha(clase.fecha_ejecucion)}</small></div>`);
  if (clase.contenido) parts.push(`<article class="p">${sanitizeHtml(clase.contenido)}</article>`);
  ui.view.innerHTML = parts.join("\n");

  // Recursos como tarjeticas
  const recs = rRes.data || [];
  if (!recs.length) return;

  const frag = document.createDocumentFragment();
  recs.forEach((r) => {
    const card = document.createElement("button");
    card.className = "chip chip-rec";
    card.title = r.tipo_recurso || "";
    card.innerHTML = `${icono(r.tipo_recurso)} ${escapeHtml(r.nombre || "Recurso")}`;
    card.addEventListener("click", () => abrirRecurso(r));
    frag.appendChild(card);
  });
  ui.recursos.innerHTML = "";
  ui.recursos.appendChild(frag);
}

// =================== Recursos (visor simple) ===================

function abrirRecurso(r) {
  // Puedes reemplazar con tu modal existente; aquí un fallback simple:
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  // Para PDFs/Imagen/Audio/Video: el navegador se encarga.
  w.location.href = r.url;
}

// =================== Utilidades UI ===================

function fmtFecha(d) {
  try { return new Date(d).toLocaleDateString(); } catch { return ""; }
}

// MUY simple; asume que el HTML que guardas en BD es “confiable” (WYSIWYG propio).
// Si necesitas sanear estricto, usa una lib (DOMPurify). Aquí neutro:
function sanitizeHtml(html) { return String(html || ""); }
function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
function icono(t) {
  const k = (t || "").toLowerCase();
  if (k.includes("pdf")) return "📄";
  if (k.includes("img") || k.includes("ima") || k.includes("image")) return "🖼️";
  if (k.includes("audio")) return "🎧";
  if (k.includes("video") || k.includes("yt")) return "▶️";
  return "🔗";
}
