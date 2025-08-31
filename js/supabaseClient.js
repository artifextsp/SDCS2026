// js/supabaseClient.js
// Cliente centralizado de Supabase con compatibilidad hacia atrás.
// Soporta: setSupabaseCredentials (alias), guardarCredenciales, initSupabase, getSupabase, limpiarCredenciales

const LS_URL = 'SB_URL';
const LS_KEY = 'SB_KEY';

let _client = null;

function _save(url, key) {
  if (url) localStorage.setItem(LS_URL, String(url).trim());
  if (key) localStorage.setItem(LS_KEY, String(key).trim());
  _client = null; // forzar recreación
}

/** API nueva */
export function guardarCredenciales(url, key) { _save(url, key); }
/** Compatibilidad con código existente */
export function setSupabaseCredentials(url, key) { _save(url, key); }

/** Devuelve (o crea) el cliente supabase-js v2 */
export function getSupabase() {
  if (_client) return _client;

  const url = (localStorage.getItem(LS_URL) || '').trim();
  const key = (localStorage.getItem(LS_KEY) || '').trim();

  if (!window.supabase) {
    throw new Error('Supabase JS no está cargado. Incluye el CDN en el HTML.');
  }
  if (!/^https:\/\/.+\.supabase\.co$/.test(url) || !key) {
    throw new Error('Faltan credenciales de Supabase. Llama a setSupabaseCredentials(url, key).');
  }

  // Log mínimo (no imprime la key completa)
  console.log('[SB] URL:', url);
  console.log('[SB] KEY len:', key.length, 'prefix:', key.slice(0, 10));

  _client = window.supabase.createClient(url, key);
  return _client;
}

/** Compatibilidad: algunos módulos llaman initSupabase(url?, key?) */
export function initSupabase(url, key) {
  if (url && key) _save(url, key);
  return getSupabase();
}

/** Limpia credenciales guardadas */
export function limpiarCredenciales() {
  localStorage.removeItem(LS_URL);
  localStorage.removeItem(LS_KEY);
  _client = null;
  console.log('Credenciales de Supabase eliminadas.');
}

// Helper de consola para pruebas rápidas
window.sbSet = (u, k) => { _save(u, k); console.log('Credenciales guardadas.'); };
