// js/auth.js
import { getSupabase } from './supabaseClient.js';

/** Valida el código contra la RPC */
export async function validarAccesoPorCodigo(codigo) {
  const sb = getSupabase();
  const { data, error } = await sb.rpc('fn_validar_codigo', { p_codigo: String(codigo) });
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Código inválido');
  const r = data[0];
  return { perfil: r.perfil, grado: r.grado, codigo: r.codigo };
}

/** Guarda la sesión mínima que usa el dashboard */
export function guardarSesion({ perfil, grado, codigo }) {
  sessionStorage.setItem('sdcs_sesion', JSON.stringify({ perfil, grado, codigo }));
}

/** Redirige según perfil */
export function redirigirSegunPerfil(perfil) {
  // Ajusta rutas si tus html están en otra carpeta
  if ((perfil || '').toUpperCase() === 'COORDINADOR') {
    window.location.href = './administrador/dashboard.html';
  } else {
    window.location.href = './dashboard-estudiante.html';
  }
}
