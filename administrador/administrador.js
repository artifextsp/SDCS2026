// administrador/administrador.js
// Módulo de acceso para Administrador (robusto, con compat. hacia atrás).
// Requiere: <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
//           y ../js/auth.js con las funciones exportadas.

import {
  validarAccesoPorCodigo,
  setUserSession,
  redirigirSegunPerfil
} from '../js/auth.js';

// -------- Utilidades DOM / Estado --------
const qs  = (s, c = document) => c.querySelector(s);
const on  = (el, ev, fn) => el && el.addEventListener(ev, fn);
const $form   = qs('#formAcceso') || qs('form');         // si existe
const $input  = qs('#codigo') || qs('input[type="text"], input[type="number"]');
const $btn    = qs('#btnEntrar') || qs('button[type="submit"], button');
const $msg    = qs('#feedback') || qs('#msg') || qs('.feedback');

function setMsg(text = '', kind = 'info') {
  if (!$msg) return;
  $msg.textContent = text;
  $msg.className = '';
  $msg.classList.add('feedback', `is-${kind}`);
  $msg.style.display = text ? 'block' : 'none';
}

function setBusy(v) {
  if ($btn) {
    $btn.disabled = !!v;
    $btn.style.opacity = v ? '0.7' : '1';
  }
  if ($input) {
    $input.readOnly = !!v;
  }
}

function shake(el) {
  if (!el) return;
  el.classList.remove('shake');
  // forzar reflow
  void el.offsetWidth;
  el.classList.add('shake');
}

// Rate-limit suave a intentos (evita spam de requests)
const RL_KEY = 'adm_try';
function canTry() {
  try {
    const raw = sessionStorage.getItem(RL_KEY);
    if (!raw) return true;
    const { t, n } = JSON.parse(raw);
    const now = Date.now();
    // si hizo 3 intentos en los últimos 5s, pedir pausa 3s
    if (n >= 3 && now - t < 5000) return false;
    return true;
  } catch { return true; }
}
function recordTry(ok) {
  try {
    if (ok) { sessionStorage.removeItem(RL_KEY); return; }
    const raw = sessionStorage.getItem(RL_KEY);
    const now = Date.now();
    if (!raw) {
      sessionStorage.setItem(RL_KEY, JSON.stringify({ t: now, n: 1 }));
    } else {
      const o = JSON.parse(raw);
      if (now - o.t > 5000) sessionStorage.setItem(RL_KEY, JSON.stringify({ t: now, n: 1 }));
      else sessionStorage.setItem(RL_KEY, JSON.stringify({ t: o.t, n: (o.n || 0) + 1 }));
    }
  } catch {}
}

// -------- DEBUG opcional (QA) --------
// Permite: /administrador/administrador.html?debug=1&perfil=administrador
const params = new URLSearchParams(location.search);
const DEBUG  = params.get('debug') === '1';
if (DEBUG && params.get('perfil')) {
  const perfil = String(params.get('perfil')).toLowerCase() || 'administrador';
  const grado  = parseInt(params.get('grado') || '1', 10);
  // Bypass total para QA
  setUserSession({ codigo: 'DEBUG', nombre: 'Debug', perfil, grado: Number.isFinite(grado) ? grado : null });
  redirigirSegunPerfil(perfil);
}

// -------- Lógica de acceso --------
async function intentarLogin() {
  try {
    if (!canTry()) {
      setMsg('Demasiados intentos. Espera unos segundos…', 'warn');
      shake($form || $btn || $input);
      return;
    }

    const raw = ($input?.value || '').trim();
    if (!raw) {
      setMsg('Ingresa tu código.', 'warn');
      shake($input);
      return;
    }

    // Acepta 1..20 dígitos. Si tu política es 6 dígitos exactos, cambia la regex:
    // if (!/^\d{6}$/.test(raw)) { ... }
    if (!/^\d{1,20}$/.test(raw)) {
      setMsg('El código debe ser numérico.', 'warn');
      shake($input);
      return;
    }

    setBusy(true);
    setMsg('Validando…', 'info');

    const { data, error } = await validarAccesoPorCodigo(raw);
    if (error) {
      recordTry(false);
      setMsg('Error: ' + (error.message || 'No se pudo validar.'), 'err');
      shake($form || $btn || $input);
      return;
    }
    if (!data) {
      recordTry(false);
      setMsg('Código no válido.', 'err');
      shake($input);
      return;
    }

    // Éxito
    recordTry(true);
    setUserSession(data);
    setMsg('Acceso concedido. Redirigiendo…', 'ok');
    redirigirSegunPerfil(data.perfil);

  } catch (e) {
    console.error(e);
    recordTry(false);
    setMsg('Ocurrió un error inesperado.', 'err');
    shake($form || $btn || $input);
  } finally {
    setBusy(false);
  }
}

// -------- Wire-up de eventos --------
function bind() {
  // Submit de formulario si existe
  on($form, 'submit', (ev) => { ev.preventDefault(); intentarLogin(); });
  // Click en botón
  on($btn, 'click', intentarLogin);
  // Enter en input
  on($input, 'keydown', (e) => { if (e.key === 'Enter') intentarLogin(); });

  // Prefill por query (?code=943009)
  const pre = params.get('code') || params.get('codigo');
  if (pre && $input) $input.value = pre;

  // Autofocus
  setTimeout(() => { try { $input?.focus(); $input?.select(); } catch {} }, 50);

  // Muestra si está offline
  function onNet() {
    if (!navigator.onLine) setMsg('Sin conexión. Intenta nuevamente cuando vuelvas a estar en línea.', 'warn');
    else if ($msg?.textContent?.startsWith('Sin conexión')) setMsg('', 'info');
  }
  window.addEventListener('online', onNet);
  window.addEventListener('offline', onNet);
  onNet();
}

bind();

// Exponer para soporte (opcional)
window.sdcsAuthAdm = { intentarLogin };
