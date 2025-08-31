// js/auth.js
// Lógica de autenticación: valida el código, guarda sesión y redirige
import { supabase } from './supabaseClient.js';

/**
 * Valida el código contra la RPC "fn_validar_codigo" si existe.
 * Si no existe, hace fallback a la tabla "usuarios".
 * Devuelve { data: { perfil, grado, codigo }, error }
 */
export async function validarAccesoPorCodigo(codigo) {
  try {
    // 1) Intento vía RPC
    const rpcRes = await supabase.rpc('fn_validar_codigo', { p_codigo: codigo });
    if (!rpcRes.error && rpcRes.data) {
      // La RPC puede devolver array o un objeto
      const row = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
      if (row) {
        // Normalizamos nombres de campos por seguridad
        const perfil = row.perfil ?? row.a_perfil ?? row.perfil_usuario ?? null;
        const grado  = toInt(row.grado ?? row.a_grado ?? null);
        const code   = String(row.codigo ?? codigo);
        if (perfil) return { data: { perfil, grado, codigo: code }, error: null };
      }
    }

    // 2) Fallback a tabla usuarios (si la RPC no existe o devolvió vacío)
    //    Estructura esperada (según tu captura):
    //    - codigo (bigint/text)
    //    - nombre = "Grado 6°"
    //    - perfil = "ESTUDIANTE" | "COORDINADOR" | "ADMINISTRADOR"
    const { data: user, error: err2 } = await supabase
      .from('usuarios')
      .select('codigo, nombre, perfil')
      .eq('codigo', codigo)
      .maybeSingle();

    if (err2) return { data: null, error: err2 };
    if (!user) return { data: null, error: null };

    // Derivar grado desde nombre "Grado 6°"
    const grado = parseGradoDesdeNombre(user.nombre);
    return { data: { perfil: user.perfil, grado, codigo: String(user.codigo) }, error: null };
  } catch (e) {
    return { data: null, error: e };
  }
}

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseGradoDesdeNombre(nombre) {
  // acepta "Grado 6°", "Grado 10", "grado 3", etc.
  if (!nombre) return null;
  const m = /grado\s*(\d{1,2})/i.exec(nombre);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Redirige según el perfil indicado.
 * Admin/Coordinador -> dashboard del admin
 * Estudiante        -> dashboard-estudiante
 */
export function redirigirSegunPerfil(perfil) {
  const p = String(perfil || '').toUpperCase();
  if (p.includes('ADMIN')) {
    // acceso.html -> ./administrador/dashboard.html
    window.location.href = './administrador/dashboard.html';
  } else if (p.includes('COORDIN')) {
    // (si manejas coordinador con el mismo dashboard del admin)
    window.location.href = './administrador/dashboard.html';
  } else {
    window.location.href = './dashboard-estudiante.html';
  }
}
