// /coordinador/acceso-coordinador.js
import {
  validarAccesoPorCodigoCoord,
  redirigirCoordinador,
  setCoordSession
} from './coordAuth.js';

const $ = (id) => document.getElementById(id);
const input = $('codigo');
const btn   = $('btn');
const msg   = $('msg');

function showMsg(text, kind = 'err') {
  msg.style.display = text ? 'block' : 'none';
  msg.className = 'msg ' + (kind || '');
  msg.textContent = text || '';
}

btn.addEventListener('click', async () => {
  showMsg('', '');
  btn.disabled = true;

  const codigo = (input.value || '').trim();
  if (!/^\d{6}$/.test(codigo)) {
    showMsg('El código debe tener 6 dígitos.');
    btn.disabled = false; return;
  }

  const { data, error } = await validarAccesoPorCodigoCoord(codigo);
  if (error) { showMsg('Error: ' + (error.message || 'No se pudo validar.')); btn.disabled = false; return; }
  if (!data) { showMsg('Código no válido.'); btn.disabled = false; return; }

  if (String(data.perfil).toUpperCase() !== 'COORDINADOR') {
    showMsg(`Acceso denegado: tu perfil es ${data.perfil}.`);
    btn.disabled = false; return;
  }

  setCoordSession({ codigo: data.codigo, nombre: data.nombre, perfil: data.perfil });
  showMsg('Acceso concedido. Redirigiendo…', 'ok');
  try { redirigirCoordinador(data.perfil); } catch (e) { showMsg(e.message || 'No autorizado.'); }
  finally { btn.disabled = false; }
});

input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
