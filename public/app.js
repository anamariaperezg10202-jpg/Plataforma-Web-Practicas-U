const $app = document.getElementById('app');
let sesion = JSON.parse(localStorage.getItem('sesion') || 'null');
let programas = [];

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function aviso(msg, error = false) {
  const el = document.getElementById('aviso');
  el.textContent = msg; el.className = 'aviso' + (error ? ' err' : ''); el.hidden = false;
  clearTimeout(aviso.t); aviso.t = setTimeout(() => (el.hidden = true), 3500);
}

async function api(ruta, opciones = {}) {
  const r = await fetch('/api' + ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(sesion ? { Authorization: 'Bearer ' + sesion.token } : {}) },
    body: opciones.body ? JSON.stringify(opciones.body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && sesion) { cerrarSesion(); }
    throw new Error((data.errores && data.errores.join(' ')) || data.error || 'Ocurrió un error.');
  }
  return data;
}

const datos = (form) => Object.fromEntries(new FormData(form).entries());

function guardarSesion(s) { sesion = s; localStorage.setItem('sesion', JSON.stringify(s)); render(); }
function cerrarSesion() { sesion = null; localStorage.removeItem('sesion'); render(); }
document.getElementById('salir').onclick = cerrarSesion;

/* ---------- Acceso ---------- */
function vistaAcceso(modo = 'login') {
  const opts = programas.map((p) => `<option value="${p.id_programa}">${esc(p.nombre)}</option>`).join('');
  const formularios = {
    login: `<h1>Iniciar sesión</h1><p class="sub">Ingresa con tu correo y contraseña.</p>
      <form id="f"><label>Correo</label><input name="correo" type="email" required>
      <label>Contraseña</label><input name="password" type="password" required>
      <div class="acciones"><button class="btn">Ingresar</button></div></form>`,
    estudiante: `<h1>Registro de estudiante</h1><p class="sub">Crea tu cuenta para postularte a vacantes.</p>
      <form id="f"><div class="grid"><div><label>Nombre completo</label><input name="nombre" required></div>
      <div><label>Documento</label><input name="documento" required></div>
      <div><label>Correo</label><input name="correo" type="email" required></div>
      <div><label>Contraseña</label><input name="password" type="password" required></div>
      <div><label>Programa</label><select name="id_programa">${opts}</select></div>
      <div><label>Semestre</label><input name="semestre" type="number" min="1" max="12" required></div></div>
      <div class="acciones"><button class="btn">Crear cuenta</button></div></form>`,
    empresa: `<h1>Registro de empresa</h1><p class="sub">Publica vacantes para practicantes.</p>
      <form id="f"><div class="grid"><div><label>Razón social</label><input name="razon_social" required></div>
      <div><label>NIT</label><input name="nit" placeholder="900123456-7" required></div>
      <div><label>Persona de contacto</label><input name="contacto" required></div>
      <div><label>Correo</label><input name="correo" type="email" required></div>
      <div><label>Contraseña</label><input name="password" type="password" required></div></div>
      <div class="acciones"><button class="btn">Crear cuenta</button></div></form>`,
  };
  $app.innerHTML = `<div class="centro"><div class="card">${formularios[modo]}
    <p class="sub" style="margin-top:16px">${modo === 'login'
      ? '¿No tienes cuenta? <button class="link" data-m="estudiante">Soy estudiante</button> · <button class="link" data-m="empresa">Soy empresa</button>'
      : '<button class="link" data-m="login">Ya tengo cuenta</button>'}</p></div></div>`;
  $app.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => vistaAcceso(b.dataset.m)));
  document.getElementById('f').onsubmit = async (e) => {
    e.preventDefault();
    try {
      const ruta = modo === 'login' ? '/auth/login' : `/auth/registro/${modo}`;
      const r = await api(ruta, { method: 'POST', body: datos(e.target) });
      guardarSesion({ token: r.token, rol: r.rol, nombre: r.nombre || datos(e.target).nombre || datos(e.target).razon_social });
    } catch (err) { aviso(err.message, true); }
  };
}

/* ---------- Estudiante ---------- */
async function vistaEstudiante(tab = 'vacantes') {
  const [vacantes, mias] = await Promise.all([api('/vacantes'), api('/postulaciones/mias')]);
  const postuladas = new Set(mias.map((m) => m.id_vacante));
  const tabs = `<div class="tabs"><button class="tab ${tab === 'vacantes' ? 'on' : ''}" data-t="vacantes">Vacantes disponibles</button>
    <button class="tab ${tab === 'mias' ? 'on' : ''}" data-t="mias">Mis postulaciones (${mias.length})</button></div>`;
  const cuerpo = tab === 'vacantes'
    ? `<div class="card"><h2>Vacantes aprobadas</h2>${vacantes.map((v) => `<div class="vac"><h3>${esc(v.titulo)}</h3>
        <div class="meta">${esc(v.empresa)} · ${esc(v.modalidad)} · ${v.cupos} cupo(s)${v.programa ? ' · ' + esc(v.programa) : ''}</div>
        <div>${esc(v.descripcion)}</div><div class="acciones">${postuladas.has(v.id_vacante)
          ? '<span class="badge Enviada">Ya te postulaste</span>' : `<button class="btn" data-p="${v.id_vacante}">Postularme</button>`}</div></div>`).join('') || '<div class="vacio">No hay vacantes aprobadas por ahora.</div>'}</div>`
    : `<div class="card"><h2>Estado de mis postulaciones</h2>${mias.length ? `<table><tr><th>Vacante</th><th>Empresa</th><th>Fecha</th><th>Estado</th></tr>${mias.map((m) =>
        `<tr><td>${esc(m.titulo)}</td><td>${esc(m.empresa)}</td><td>${esc(m.fecha)}</td><td><span class="badge ${m.estado}">${m.estado}</span></td></tr>`).join('')}</table>` : '<div class="vacio">Aún no te has postulado.</div>'}</div>`;
  $app.innerHTML = `<h1>Panel del estudiante</h1><p class="sub">Consulta vacantes, postúlate y sigue el estado de tu proceso.</p>${tabs}${cuerpo}`;
  $app.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => vistaEstudiante(b.dataset.t)));
  $app.querySelectorAll('[data-p]').forEach((b) => (b.onclick = async () => {
    try { await api('/postulaciones', { method: 'POST', body: { id_vacante: Number(b.dataset.p) } }); aviso('Postulación enviada.'); vistaEstudiante('mias'); }
    catch (err) { aviso(err.message, true); }
  }));
}

/* ---------- Empresa ---------- */
async function vistaEmpresa(tab = 'mis', abierta = null) {
  const vacantes = await api('/vacantes');
  const tabs = `<div class="tabs"><button class="tab ${tab === 'mis' ? 'on' : ''}" data-t="mis">Mis vacantes (${vacantes.length})</button>
    <button class="tab ${tab === 'nueva' ? 'on' : ''}" data-t="nueva">Publicar vacante</button></div>`;
  let cuerpo;
  if (tab === 'nueva') {
    const opts = '<option value="">Todos los programas</option>' + programas.map((p) => `<option value="${p.id_programa}">${esc(p.nombre)}</option>`).join('');
    cuerpo = `<div class="card"><h2>Nueva vacante</h2><p class="sub">Será revisada por el coordinador antes de publicarse.</p>
      <form id="f"><label>Título</label><input name="titulo" required>
      <label>Descripción</label><textarea name="descripcion" required></textarea>
      <div class="grid"><div><label>Modalidad</label><select name="modalidad"><option>Presencial</option><option>Remota</option><option>Híbrida</option></select></div>
      <div><label>Cupos</label><input name="cupos" type="number" min="1" max="50" value="1"></div>
      <div><label>Programa dirigido</label><select name="id_programa">${opts}</select></div></div>
      <div class="acciones"><button class="btn">Enviar a aprobación</button></div></form></div>`;
  } else {
    let detalle = '';
    if (abierta) {
      const ps = await api(`/vacantes/${abierta}/postulaciones`);
      detalle = `<div class="card"><h2>Postulantes</h2>${ps.length ? `<table><tr><th>Estudiante</th><th>Programa</th><th>Sem.</th><th>Estado</th><th></th></tr>${ps.map((p) =>
        `<tr><td>${esc(p.nombre)}</td><td>${esc(p.programa)}</td><td>${p.semestre}</td><td><span class="badge ${p.estado}">${p.estado}</span></td>
        <td>${p.estado === 'Enviada' ? `<button class="btn ok" data-e="${p.id_postulacion}|Aceptada">Aceptar</button> <button class="btn mal" data-e="${p.id_postulacion}|Rechazada">Rechazar</button>` : ''}</td></tr>`).join('')}</table>` : '<div class="vacio">Todavía no hay postulantes.</div>'}</div>`;
    }
    cuerpo = `<div class="card"><h2>Vacantes publicadas</h2>${vacantes.map((v) => `<div class="vac"><h3>${esc(v.titulo)} <span class="badge ${v.estado}">${v.estado}</span></h3>
      <div class="meta">${esc(v.modalidad)} · ${v.cupos} cupo(s) · ${v.postulantes} postulante(s)${v.observaciones ? ' · Observación: ' + esc(v.observaciones) : ''}</div>
      <div class="acciones"><button class="btn sec" data-v="${v.id_vacante}">Ver postulantes</button></div></div>`).join('') || '<div class="vacio">Aún no has publicado vacantes.</div>'}</div>${detalle}`;
  }
  $app.innerHTML = `<h1>Panel de la empresa</h1><p class="sub">Publica vacantes y gestiona a los postulantes.</p>${tabs}${cuerpo}`;
  $app.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => vistaEmpresa(b.dataset.t)));
  $app.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => vistaEmpresa('mis', b.dataset.v)));
  $app.querySelectorAll('[data-e]').forEach((b) => (b.onclick = async () => {
    const [id, estado] = b.dataset.e.split('|');
    try { await api(`/postulaciones/${id}/estado`, { method: 'PATCH', body: { estado } }); aviso(`Postulación ${estado.toLowerCase()}.`); vistaEmpresa('mis', abierta); }
    catch (err) { aviso(err.message, true); }
  }));
  const f = document.getElementById('f');
  if (f) f.onsubmit = async (e) => {
    e.preventDefault();
    const d = datos(f); d.id_programa = d.id_programa ? Number(d.id_programa) : null; d.cupos = Number(d.cupos);
    try { await api('/vacantes', { method: 'POST', body: d }); aviso('Vacante enviada a aprobación.'); vistaEmpresa('mis'); }
    catch (err) { aviso(err.message, true); }
  };
}

/* ---------- Coordinador ---------- */
async function vistaCoordinador(estado = 'Pendiente') {
  const vacantes = await api('/vacantes?estado=' + estado);
  const tabs = ['Pendiente', 'Aprobada', 'Rechazada'].map((e) => `<button class="tab ${e === estado ? 'on' : ''}" data-s="${e}">${e}s</button>`).join('');
  $app.innerHTML = `<h1>Panel del coordinador</h1><p class="sub">Aprueba o rechaza las vacantes publicadas por las empresas.</p>
    <div class="tabs">${tabs}</div><div class="card"><h2>Vacantes ${estado.toLowerCase()}s</h2>${vacantes.map((v) => `<div class="vac"><h3>${esc(v.titulo)}</h3>
    <div class="meta">${esc(v.empresa)} · ${esc(v.modalidad)} · ${v.cupos} cupo(s) · publicada el ${esc(v.fecha_publicacion)}</div><div>${esc(v.descripcion)}</div>
    ${estado === 'Pendiente' ? `<div class="acciones"><button class="btn ok" data-a="${v.id_vacante}">Aprobar</button><button class="btn mal" data-r="${v.id_vacante}">Rechazar</button></div>` : ''}</div>`).join('') || '<div class="vacio">No hay vacantes en este estado.</div>'}</div>`;
  $app.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => vistaCoordinador(b.dataset.s)));
  const cambiar = async (id, body) => {
    try { await api(`/vacantes/${id}/estado`, { method: 'PATCH', body }); aviso(`Vacante ${body.estado.toLowerCase()}.`); vistaCoordinador(estado); }
    catch (err) { aviso(err.message, true); }
  };
  $app.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => cambiar(b.dataset.a, { estado: 'Aprobada' })));
  $app.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => {
    const motivo = prompt('Motivo del rechazo:');
    if (motivo) cambiar(b.dataset.r, { estado: 'Rechazada', observaciones: motivo });
  }));
}

/* ---------- Inicio ---------- */
async function render() {
  const box = document.getElementById('sesion');
  box.hidden = !sesion;
  if (sesion) document.getElementById('quien').textContent = `${sesion.nombre || ''} · ${sesion.rol}`;
  try {
    if (!programas.length) programas = await api('/programas');
    if (!sesion) return vistaAcceso();
    if (sesion.rol === 'estudiante') return await vistaEstudiante();
    if (sesion.rol === 'empresa') return await vistaEmpresa();
    return await vistaCoordinador();
  } catch (err) { aviso(err.message, true); }
}
render();
