// js/supabaseClient.js
// Cliente único de Supabase para todo el front (ESM + CDN v2).
// ───────────────────────────────────────────────────────────
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// OPCIÓN A: Pon aquí tus credenciales (ENTRE COMILLAS)
const SUPABASE_URL_HARDCODE  = "https://trfiejowmfgzudhsdpdx.supabase.co"; // ← reemplaza
const SUPABASE_ANON_HARDCODE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZmllam93bWZnenVkaHNkcGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MjM2MjksImV4cCI6MjA3MTk5OTYyOX0.SCNuSO9uKtaKfGBSi3WMIpvNFmsE66aRROJEgTUrx34";                          // ← reemplaza

// OPCIÓN B: (alternativa) léelas desde <meta> del HTML
// <meta name="supabase-url"  content="https://xxx.supabase.co">
// <meta name="supabase-anon" content="eyJh...">
const urlMeta  = document.querySelector('meta[name="supabase-url"]')?.content?.trim() || "";
const anonMeta = document.querySelector('meta[name="supabase-anon"]')?.content?.trim() || "";

// Selección final (meta > hardcode)
const SUPABASE_URL  = urlMeta  || SUPABASE_URL_HARDCODE;
const SUPABASE_ANON = anonMeta || SUPABASE_ANON_HARDCODE;

// Validación amable (evita ReferenceError)
if (!SUPABASE_URL || !/^https?:\/\/.*supabase\.co/i.test(SUPABASE_URL)) {
  throw new Error(
    "Supabase URL no configurada correctamente. Edita js/supabaseClient.js o añade <meta name='supabase-url' ...>."
  );
}
if (!SUPABASE_ANON || SUPABASE_ANON.length < 20) {
  throw new Error(
    "Supabase anon key no configurada. Edita js/supabaseClient.js o añade <meta name='supabase-anon' ...>."
  );
}

// Cliente
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Helpers de sesión (localStorage)
const LS = {
  perfil: "sdcs.perfil",
  grado:  "sdcs.grado",
  codigo: "sdcs.codigo",
};

export function guardarSesion({ perfil, grado, codigo }) {
  if (perfil) localStorage.setItem(LS.perfil, String(perfil));
  if (Number.isFinite(Number(grado))) localStorage.setItem(LS.grado, String(Number(grado)));
  if (codigo) localStorage.setItem(LS.codigo, String(codigo));
}

export function borrarSesion() {
  localStorage.removeItem(LS.perfil);
  localStorage.removeItem(LS.grado);
  localStorage.removeItem(LS.codigo);
}

export function getPerfilActual() {
  return localStorage.getItem(LS.perfil) || null;
}

export function getGradoActual() {
  const g = Number(localStorage.getItem(LS.grado));
  return Number.isFinite(g) ? g : null;
}

export function getCodigoActual() {
  return localStorage.getItem(LS.codigo) || null;
}
