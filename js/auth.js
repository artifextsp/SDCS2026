import { supabase } from './supabaseClient.js';

/** Valida el código (exacto 6 dígitos) contra Supabase */
export async function validarAccesoPorCodigo(codigoStr) {
  const clean = String(codigoStr).trim();
  if (!/^\d{6}$/.test(clean)) {
    return { data: null, error: new Error('El código debe ser numérico de 6 dígitos.') };
  }

  const codigoNum = parseInt(clean, 10);
  const { data, error } = await supabase.rpc('fn_validar_codigo', { codigo_in: codigoNum });

  if (error) return { data: null, error };
  if (!data || data.length === 0) return { data: null, error: null };
  return { data: data[0], error: null }; // { codigo, nombre, perfil }
}

/** Redirige según el perfil */
export function redirigirSegunPerfil(perfil) {
  if (perfil === 'ADMINISTRADOR') {
    window.location.href = '../administrador/dashboard.html';
  } else if (perfil === 'COORDINADOR') {
    window.location.href = '../html/dashboard-coordinador.html';
  } else {
    window.location.href = '../html/dashboard-estudiante.html';
  }
}
