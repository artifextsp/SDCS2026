/* /js/auth.js  —  Módulo de autenticación SDCS (Fases 1–3)
   Requiere el CDN v2 de Supabase cargado en la página:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
*/

/* =========================
   1) Supabase Client
   ========================= */
const SUPABASE_URL = 'https://trfiejowmfgzudhsdpdx.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyZmllam93bWZnenVkaHNkcGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MjM2MjksImV4cCI6MjA3MTk5OTYyOX0.SCNuSO9uKtaKfGBSi3WMIpvNFmsE66aRROJEgTUrx34';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* =========================
   2) Constantes / helpers
   ========================= */
const STORAGE_KEY = 'sdcs_user';

const ROUTES = {
  login: '/html/acceso.html',
  adminDashboard: '/administrador/dashboard.html',
  studentDashboard: '/html/dashboard-estudiante.html',
};

// Normaliza string de perfil a dos buckets: "admin" | "estudiante"
function normalizePerfil(p) {
  if (!p) return null;
  const s = String(p).toLowerCase();
  // Trata coordinador, admin, administrador, docente como rol admin (si aplica)
  if (['admin', 'administrador', 'coordinador'].includes(s)) return 'admin';
  if (['estudiante', 'alumno', 'student'].includes(s)) return 'estudiante';
  return s; // fallback por si en el futuro se agregan más perfiles
}

// Obtiene la primera fila cuando Supabase retorna array o objeto
function firstRow(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data; // algunos RPC pueden devolver objeto directo
}

/* =========================
   3) API principal
   ========================= */

/** Valida el código contra la función segura en la BD.
 *  Espera que el RPC retorne al menos: { perfil, grado, nombre?, codigo? }
 *  RPC: fn_validar_codigo(codigo_in integer)
 */
export async function validarAccesoPorCodigo(codigoStr) {
  try {
    const clean = String(codigoStr || '').trim();
    if (!/^\d{1,20}$/.test(clean)) {
      return { data: null, error: new Error('El código debe ser numérico.') };
    }

    const codigoNum = Number(clean);
    // Asegúrate que tu RPC se llama exactamente así y recibe { codigo_in: integer }
    const { data, error } = await supabase.rpc('fn_validar_codigo', { codigo_in: codigoNum });

    if (error) return { data: null, error };
    const row = firstRow(data);
    if (!row) return { data: null, error: null };

    // Normaliza claves habituales
    const perfil = row.perfil ?? row.role ?? row.rol ?? null;
    const grado  = row.grado ?? row.grado_id ?? row.curso ?? null;
    const nombre = row.nombre ?? row.name ?? null;

    const out = { ...row, perfil, grado, nombre, codigo: codigoNum };
    return { data: out, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/** Guarda sesión mínima en localStorage (perfil + grado [+extras]) */
export function setSesionUsuario(payload) {
  const now = new Date().toISOString();
  const perfil = normalizePerfil(payload?.perfil);
  const grado  = payload?.grado != null ? Number(payload.grado) : null;

  const sess = {
    perfil,
    grado,
    nombre: payload?.nombre ?? null,
    codigo: payload?.codigo ?? null,
    createdAt: now,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sess));
  return sess;
}

/** Lee la sesión almacenada (o null) */
export function getSesionUsuario() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { return null; }
}

/** Elimina la sesión y redirige (opcional) */
export function logout(redirectTo = ROUTES.login) {
  localStorage.removeItem(STORAGE_KEY);
  if (redirectTo) window.location.href = redirectTo;
}

/** Redirige según el perfil indicado u obtenido de la sesión */
export function redirigirSegunPerfil(perfilMaybe) {
  const perfil = normalizePerfil(
    typeof perfilMaybe === 'string' ? perfilMaybe : (perfilMaybe?.perfil ?? getSesionUsuario()?.perfil)
  );

  if (perfil === 'admin') {
    window.location.href = ROUTES.adminDashboard;
  } else if (perfil === 'estudiante') {
    window.location.href = ROUTES.studentDashboard;
  } else {
    // Perfil desconocido: pedir login nuevamente
    logout(ROUTES.login);
  }
}

/** Protección de páginas (middleware de front):
 *  requireAuth({ allow: ['admin'] })  -> solo admins
 *  requireAuth({ allow: ['estudiante'] }) -> solo estudiantes
 *  requireAuth() -> ambos (admin/estudiante)
 */
export function requireAuth(options = {}) {
  const { allow = ['admin', 'estudiante'], redirectTo = ROUTES.login } = options;
  const sess = getSesionUsuario();
  if (!sess || !sess.perfil) {
    window.location.href = redirectTo;
    return null;
  }
  const perfil = normalizePerfil(sess.perfil);
  if (!allow.map(normalizePerfil).includes(perfil)) {
    window.location.href = redirectTo;
    return null;
  }
  return sess;
}

/* =========================
   4) Flujos listos para usar
   ========================= */

/** Flujo típico para tu acceso.html:
 *  Llamas a validarAccesoPorCodigo, guardas la sesión y rediriges.
 */
export async function loginConCodigo(codigoStr) {
  const { data, error } = await validarAccesoPorCodigo(codigoStr);
  if (error) throw error;
  if (!data) throw new Error('Código no válido.');
  const sess = setSesionUsuario(data);
  redirigirSegunPerfil(sess.perfil);
  return sess;
}

/** Helper: grado del estudiante (o null si no aplica) */
export function getGradoActual() {
  const s = getSesionUsuario();
  return s?.grado != null ? Number(s.grado) : null;
}

/** Helper: bools de conveniencia */
export function isAdmin() {
  return normalizePerfil(getSesionUsuario()?.perfil) === 'admin';
}
export function isEstudiante() {
  return normalizePerfil(getSesionUsuario()?.perfil) === 'estudiante';
}
