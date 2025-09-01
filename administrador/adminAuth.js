// /administrador/adminAuth.js
import { supabase } from './adminSupabaseClient.js';

/** Guarda la sesión del admin en sessionStorage (evita colisiones con otros módulos). */
export function setUserSession(user) {
  try {
    sessionStorage.setItem('sdcs_admin_user', JSON.stringify(user || null));
  } catch (_) {}
}

export function getUserSession() {
  try {
    const raw = sessionStorage.getItem('sdcs_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

/** Valida el código contra la función segura en la BD (fn_validar_codigo). */
export async function validarAccesoPorCodigoAdmin(codigoStr) {
  const clean = String(codigoStr).trim();
  if (!/^\d{1,20}$/.test(clean)) {
    return { data: null, error: new Error('El código debe ser numérico.') };
  }
  const codigoNum = Number(clean);
  const { data, error } = await supabase.rpc('fn_validar_codigo', { codigo_in: codigoNum });
  if (error) return { data: null, error };
  if (!data || data.length === 0) return { data: null, error: null };
  // data[0] esperado: { codigo, nombre, perfil }
  return { data: data[0], error: null };
}

/** Redirige solo si el perfil es ADMINISTRADOR. */
export function redirigirAdmin(perfil) {
  if (perfil === 'ADMINISTRADOR') {
    window.location.href = './dashboard.html';
  } else {
    throw new Error('Acceso denegado: perfil no autorizado para Administrador.');
  }
}
