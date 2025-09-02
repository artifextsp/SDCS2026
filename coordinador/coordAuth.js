// /coordinador/coordAuth.js
import { supabase } from './coordSupabaseClient.js';

const KEY = 'sdcs_coord_user';

export function setCoordSession(user) {
  try { sessionStorage.setItem(KEY, JSON.stringify(user || null)); } catch {}
}

export function getCoordSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function validarAccesoPorCodigoCoord(codigoStr) {
  const clean = String(codigoStr).trim();
  if (!/^\d{1,20}$/.test(clean)) {
    return { data: null, error: new Error('El código debe ser numérico.') };
  }
  const { data, error } = await supabase.rpc('fn_validar_codigo', { codigo_in: Number(clean) });
  if (error) return { data: null, error };
  if (!data || !data[0]) return { data: null, error: null };
  return { data: data[0], error: null };
}

/** Ruta ABSOLUTA sin /html porque ahora está en la raíz /coordinador */
export function redirigirCoordinador(perfil) {
  if (String(perfil).toUpperCase() === 'COORDINADOR') {
    window.location.assign('/coordinador/dashboard-coordinador.html');
  } else {
    throw new Error('Acceso denegado: perfil no autorizado para Coordinador.');
  }
}
