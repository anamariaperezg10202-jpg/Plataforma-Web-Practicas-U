const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MODALIDADES = ['Presencial', 'Remota', 'Híbrida'];

const validarCorreo = (c) => typeof c === 'string' && CORREO_RE.test(c.trim());
const validarPassword = (p) => typeof p === 'string' && p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);
const validarNit = (n) => typeof n === 'string' && /^\d{9}(-?\d)?$/.test(n.trim());
const textoMin = (t, min) => typeof t === 'string' && t.trim().length >= min;

function validarRegistroEstudiante(d = {}) {
  const errores = [];
  if (!textoMin(d.nombre, 3)) errores.push('El nombre es obligatorio (mínimo 3 caracteres).');
  if (!/^\d{6,12}$/.test(String(d.documento || ''))) errores.push('El documento debe tener entre 6 y 12 dígitos.');
  if (!validarCorreo(d.correo)) errores.push('El correo no es válido.');
  if (!validarPassword(d.password)) errores.push('La contraseña debe tener mínimo 8 caracteres, con letras y números.');
  if (!Number.isInteger(Number(d.id_programa))) errores.push('Debe seleccionar un programa.');
  const sem = Number(d.semestre);
  if (!Number.isInteger(sem) || sem < 1 || sem > 12) errores.push('El semestre debe estar entre 1 y 12.');
  return errores;
}

function validarRegistroEmpresa(d = {}) {
  const errores = [];
  if (!textoMin(d.razon_social, 3)) errores.push('La razón social es obligatoria.');
  if (!validarNit(d.nit)) errores.push('El NIT no es válido (9 dígitos y dígito de verificación opcional).');
  if (!textoMin(d.contacto, 3)) errores.push('El nombre de contacto es obligatorio.');
  if (!validarCorreo(d.correo)) errores.push('El correo no es válido.');
  if (!validarPassword(d.password)) errores.push('La contraseña debe tener mínimo 8 caracteres, con letras y números.');
  return errores;
}

function validarVacante(d = {}) {
  const errores = [];
  if (!textoMin(d.titulo, 5)) errores.push('El título debe tener mínimo 5 caracteres.');
  if (!textoMin(d.descripcion, 20)) errores.push('La descripción debe tener mínimo 20 caracteres.');
  if (!MODALIDADES.includes(d.modalidad)) errores.push('La modalidad debe ser Presencial, Remota o Híbrida.');
  const cupos = Number(d.cupos);
  if (!Number.isInteger(cupos) || cupos < 1 || cupos > 50) errores.push('Los cupos deben estar entre 1 y 50.');
  return errores;
}

module.exports = {
  MODALIDADES, validarCorreo, validarPassword, validarNit,
  validarRegistroEstudiante, validarRegistroEmpresa, validarVacante,
};
