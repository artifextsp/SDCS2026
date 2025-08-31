// html/js/acceso.js
import { validarAccesoPorCodigo, setUserSession, redirigirSegunPerfil } from '../js/auth.js';

const $ = (id) => document.getElementById(id);
const btn = $('btn');
const msg = $('msg');
const codigoEl = $('codigo');

function showMsg(text, kind = 'err') {
  msg.style.display = text ? 'block' : 'none';
  msg.className = 'msg ' + (kind || '');
  msg.textContent = text || '';
}

async function onEntrar() {
  showMsg('', '');
  btn.disabled = true;

  const codigo = (codigoEl.value || '').trim();
  if (!/^\d{6}$/.test(codigo)) {
    showMsg('El código debe tener 6 dígitos.');
    btn.disabled = false;
    return;
  }

  const { data, error } = await validarAccesoPorCodigo(codigo);
  if (error) { showMsg('Error: ' + (error.message || 'No se pudo validar.')); btn.disabled = false; return; }
  if (!data) { showMsg('Código no válido.'); btn.disabled = false; return; }

  // ⬇⬇⬇ MUY IMPORTANTE: Guardar la sesión antes de redirigir
  setUserSession(data);
  showMsg('Acceso concedido. Redirigiendo…', 'ok');
  redirigirSegunPerfil(data.perfil);
}

btn?.addEventListener('click', onEntrar);
codigoEl?.addEventListener('keydown', (e) => { if (e.key === 'Enter') onEntrar(); });
