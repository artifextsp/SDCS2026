import { validarAccesoPorCodigo, redirigirSegunPerfil } from '../js/auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);

  const btn   = $('btn');
  const msg   = $('msg');
  const input = $('codigo');

  if (!btn || !msg || !input) {
    console.error('Faltan #btn, #msg o #codigo en administrador.html');
    return;
  }

  function showMsg(text, kind='err'){
    msg.style.display = 'block';
    msg.className = 'msg ' + (kind || '');
    msg.textContent = text;
  }

  btn.addEventListener('click', async () => {
    showMsg('', ''); btn.disabled = true;

    const codigo = input.value.trim();
    if (!/^\d{6}$/.test(codigo)) { showMsg('El código debe tener 6 dígitos.'); btn.disabled = false; return; }

    const { data, error } = await validarAccesoPorCodigo(codigo);
    if (error) { showMsg('Error: ' + (error.message || 'No se pudo validar.')); btn.disabled = false; return; }
    if (!data) { showMsg('Código no válido.'); btn.disabled = false; return; }
    if (data.perfil !== 'ADMINISTRADOR') { showMsg('Acceso denegado: tu perfil es ' + data.perfil + '.'); btn.disabled = false; return; }

    showMsg('Acceso concedido. Redirigiendo…', 'ok');
    redirigirSegunPerfil(data.perfil); // -> ../administrador/dashboard.html
  });

  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') btn.click(); });
});
