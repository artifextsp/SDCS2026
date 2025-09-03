// /coordinador/coordAuth.js
import { supabase } from './coordSupabaseClient.js';

const KEY = 'sdcs_coord_user';

/* ========= Sesión ========= */
export function setCoordSession(user) {
  try { localStorage.setItem(KEY, JSON.stringify(user || {})); } catch {}
}
export function getCoordSession() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function clearCoordSession() {
  try { localStorage.removeItem(KEY); } catch {}
}

/* ========= Validación ========= */
export async function validarAccesoPorCodigoCoord(codigo) {
  const { data, error } = await supabase.rpc('valida_coordinador', {
    _codigo: Number(codigo)   // <- mandamos número
  });
  if (error) return { data: null, error };
  return { data: data && data[0] ? data[0] : null, error: null };
}


/* ========= Redirección (RELATIVA) ========= */
export function redirigirCoordinador(/* perfil */) {
  // Nada de rutas absolutas (con "/")
  window.location.href = 'dashboard-coordinador.html';
}
