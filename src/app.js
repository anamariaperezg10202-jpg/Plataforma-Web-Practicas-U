const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const v = require('./validators');
const { puedePostularse } = require('./postulaciones');

const SECRET = process.env.JWT_SECRET || 'clave-solo-para-desarrollo';
const hoy = () => new Date().toISOString().slice(0, 10);

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const firmar = (u) => jwt.sign({ id: u.id_usuario, rol: u.rol }, SECRET, { expiresIn: '8h' });
  const auth = (...roles) => (req, res, next) => {
    try {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      req.user = jwt.verify(token, SECRET);
    } catch { return res.status(401).json({ error: 'Debes iniciar sesión.' }); }
    if (roles.length && !roles.includes(req.user.rol)) return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    next();
  };
  const perfilEstudiante = (id) => db.prepare('SELECT * FROM estudiante WHERE id_usuario = ?').get(id);
  const perfilEmpresa = (id) => db.prepare('SELECT * FROM empresa WHERE id_usuario = ?').get(id);

  app.get('/api/programas', (_req, res) => res.json(db.prepare('SELECT * FROM programa ORDER BY nombre').all()));

  // ---- Módulo 1: registro e inicio de sesión (RF-01) ----
  const registrar = (rol, errores, crearPerfil) => (req, res) => {
    const errs = errores(req.body);
    if (errs.length) return res.status(400).json({ errores: errs });
    const correo = req.body.correo.trim().toLowerCase();
    if (db.prepare('SELECT 1 FROM usuario WHERE correo = ?').get(correo)) return res.status(409).json({ error: 'Ese correo ya está registrado.' });
    try {
      const tx = db.transaction(() => {
        const r = db.prepare('INSERT INTO usuario (correo, contrasena_hash, rol) VALUES (?,?,?)')
          .run(correo, bcrypt.hashSync(req.body.password, 10), rol);
        crearPerfil(r.lastInsertRowid, req.body);
        return r.lastInsertRowid;
      });
      const id = tx();
      res.status(201).json({ id_usuario: id, rol, token: firmar({ id_usuario: id, rol }) });
    } catch (e) {
      if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'El documento o NIT ya está registrado.' });
      res.status(500).json({ error: 'No fue posible completar el registro.' });
    }
  };

  app.post('/api/auth/registro/estudiante', registrar('estudiante', v.validarRegistroEstudiante, (idU, d) =>
    db.prepare('INSERT INTO estudiante (id_usuario,id_programa,documento,nombre,semestre) VALUES (?,?,?,?,?)')
      .run(idU, Number(d.id_programa), String(d.documento), d.nombre.trim(), Number(d.semestre))));

  app.post('/api/auth/registro/empresa', registrar('empresa', v.validarRegistroEmpresa, (idU, d) =>
    db.prepare('INSERT INTO empresa (id_usuario,nit,razon_social,contacto) VALUES (?,?,?,?)')
      .run(idU, d.nit.trim(), d.razon_social.trim(), d.contacto.trim())));

  app.post('/api/auth/login', (req, res) => {
    const u = db.prepare('SELECT * FROM usuario WHERE correo = ?').get(String(req.body.correo || '').trim().toLowerCase());
    if (!u || u.estado !== 'activo' || !bcrypt.compareSync(String(req.body.password || ''), u.contrasena_hash)) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    const consulta = { estudiante: 'SELECT nombre FROM estudiante WHERE id_usuario = ?',
      empresa: 'SELECT razon_social AS nombre FROM empresa WHERE id_usuario = ?',
      coordinador: 'SELECT nombre FROM coordinador WHERE id_usuario = ?' }[u.rol];
    const nombre = (db.prepare(consulta).get(u.id_usuario) || {}).nombre;
    res.json({ token: firmar(u), rol: u.rol, nombre });
  });

  // ---- Módulo 2: vacantes y postulaciones (RF-02 a RF-06) ----
  app.post('/api/vacantes', auth('empresa'), (req, res) => {
    const errs = v.validarVacante(req.body);
    if (errs.length) return res.status(400).json({ errores: errs });
    const emp = perfilEmpresa(req.user.id);
    const r = db.prepare(`INSERT INTO vacante (id_empresa,id_programa,titulo,descripcion,modalidad,cupos,fecha_publicacion)
      VALUES (?,?,?,?,?,?,?)`).run(emp.id_empresa, req.body.id_programa || null, req.body.titulo.trim(),
      req.body.descripcion.trim(), req.body.modalidad, Number(req.body.cupos), hoy());
    res.status(201).json(db.prepare('SELECT * FROM vacante WHERE id_vacante = ?').get(r.lastInsertRowid));
  });

  app.get('/api/vacantes', auth(), (req, res) => {
    const base = `SELECT v.*, e.razon_social AS empresa, p.nombre AS programa,
      (SELECT COUNT(*) FROM postulacion x WHERE x.id_vacante = v.id_vacante) AS postulantes
      FROM vacante v JOIN empresa e ON e.id_empresa = v.id_empresa LEFT JOIN programa p ON p.id_programa = v.id_programa`;
    let rows;
    if (req.user.rol === 'estudiante') rows = db.prepare(`${base} WHERE v.estado = 'Aprobada' ORDER BY v.id_vacante DESC`).all();
    else if (req.user.rol === 'empresa') rows = db.prepare(`${base} WHERE v.id_empresa = ? ORDER BY v.id_vacante DESC`).all(perfilEmpresa(req.user.id).id_empresa);
    else rows = req.query.estado
      ? db.prepare(`${base} WHERE v.estado = ? ORDER BY v.id_vacante DESC`).all(req.query.estado)
      : db.prepare(`${base} ORDER BY v.id_vacante DESC`).all();
    res.json(rows);
  });

  app.patch('/api/vacantes/:id/estado', auth('coordinador'), (req, res) => {
    const { estado, observaciones } = req.body;
    if (!['Aprobada', 'Rechazada'].includes(estado)) return res.status(400).json({ error: 'Estado no válido.' });
    if (estado === 'Rechazada' && !String(observaciones || '').trim()) return res.status(400).json({ error: 'Indica el motivo del rechazo.' });
    const r = db.prepare('UPDATE vacante SET estado = ?, observaciones = ? WHERE id_vacante = ?').run(estado, observaciones || null, req.params.id);
    if (!r.changes) return res.status(404).json({ error: 'La vacante no existe.' });
    res.json(db.prepare('SELECT * FROM vacante WHERE id_vacante = ?').get(req.params.id));
  });

  app.post('/api/postulaciones', auth('estudiante'), (req, res) => {
    const est = perfilEstudiante(req.user.id);
    const vac = db.prepare('SELECT * FROM vacante WHERE id_vacante = ?').get(req.body.id_vacante);
    const ya = vac && db.prepare('SELECT 1 FROM postulacion WHERE id_estudiante = ? AND id_vacante = ?').get(est.id_estudiante, vac.id_vacante);
    const regla = puedePostularse({ estudiante: est, vacante: vac, yaPostulado: !!ya });
    if (!regla.ok) return res.status(regla.codigo).json({ error: regla.motivo });
    const r = db.prepare('INSERT INTO postulacion (id_estudiante,id_vacante,fecha) VALUES (?,?,?)').run(est.id_estudiante, vac.id_vacante, hoy());
    res.status(201).json(db.prepare('SELECT * FROM postulacion WHERE id_postulacion = ?').get(r.lastInsertRowid));
  });

  app.get('/api/postulaciones/mias', auth('estudiante'), (req, res) => {
    res.json(db.prepare(`SELECT p.*, v.titulo, e.razon_social AS empresa FROM postulacion p
      JOIN vacante v ON v.id_vacante = p.id_vacante JOIN empresa e ON e.id_empresa = v.id_empresa
      WHERE p.id_estudiante = ? ORDER BY p.id_postulacion DESC`).all(perfilEstudiante(req.user.id).id_estudiante));
  });

  app.get('/api/vacantes/:id/postulaciones', auth('empresa'), (req, res) => {
    const vac = db.prepare('SELECT * FROM vacante WHERE id_vacante = ?').get(req.params.id);
    if (!vac || vac.id_empresa !== perfilEmpresa(req.user.id).id_empresa) return res.status(404).json({ error: 'La vacante no existe.' });
    res.json(db.prepare(`SELECT p.*, s.nombre, s.semestre, pr.nombre AS programa FROM postulacion p
      JOIN estudiante s ON s.id_estudiante = p.id_estudiante JOIN programa pr ON pr.id_programa = s.id_programa
      WHERE p.id_vacante = ? ORDER BY p.id_postulacion`).all(vac.id_vacante));
  });

  app.patch('/api/postulaciones/:id/estado', auth('empresa'), (req, res) => {
    if (!['Aceptada', 'Rechazada'].includes(req.body.estado)) return res.status(400).json({ error: 'Estado no válido.' });
    const p = db.prepare(`SELECT p.*, v.id_empresa FROM postulacion p JOIN vacante v ON v.id_vacante = p.id_vacante WHERE p.id_postulacion = ?`).get(req.params.id);
    if (!p || p.id_empresa !== perfilEmpresa(req.user.id).id_empresa) return res.status(404).json({ error: 'La postulación no existe.' });
    db.prepare('UPDATE postulacion SET estado = ? WHERE id_postulacion = ?').run(req.body.estado, p.id_postulacion);
    res.json({ ...p, estado: req.body.estado });
  });

  return app;
}

module.exports = { createApp };
