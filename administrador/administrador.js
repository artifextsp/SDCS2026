// /administrador/administrador.js
import {
  validarAccesoPorCodigoAdmin,
  redirigirAdmin,
  setUserSession
} from './adminAuth.js';

const $ = (id) => document.getElementById(id);
const btn = $('btn');
const msg = $('msg');
const input = $('codigo');

function showMsg(text, kind = 'err') {
  msg.style.display = 'block';
  msg.className = 'msg ' + (kind || '');
  msg.textContent = text;
}

btn.addEventListener('click', async () => {
  showMsg('', '');
  btn.disabled = true;

  const codigo = input.value.trim();
  if (!/^\d{6}$/.test(codigo)) {
    showMsg('El código debe tener 6 dígitos.');
    btn.disabled = false;
    return;
  }

  const { data, error } = await validarAccesoPorCodigoAdmin(codigo);
  if (error) {
    showMsg('Error: ' + (error.message || 'No se pudo validar.'));
    btn.disabled = false;
    return;
  }
  if (!data) {
    showMsg('Código no válido.');
    btn.disabled = false;
    return;
  }
  if (data.perfil !== 'ADMINISTRADOR') {
    showMsg(`Acceso denegado: tu perfil es ${data.perfil}.`);
    btn.disabled = false;
    return;
  }

  // Guardar “sesión” de admin y redirigir
  setUserSession({ codigo: data.codigo, nombre: data.nombre, perfil: data.perfil });
  showMsg('Acceso concedido. Redirigiendo…', 'ok');
  try {
    redirigirAdmin(data.perfil);
  } catch (e) {
    showMsg(e.message || 'No autorizado.');
  } finally {
    btn.disabled = false;
  }
});

// Enter para enviar
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });
