const request = require('supertest');
const { createDb } = require('../../src/db');
const { createApp } = require('../../src/app');
const { seedBase } = require('../../src/seed');

let app;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const estudiante = { nombre: 'Ana María Pérez', documento: '1037000111', correo: 'ana@soyucn.edu.co', password: 'Clave1234', id_programa: 1, semestre: 7 };
const empresa = { razon_social: 'Tech Andina SAS', nit: '900123456-7', contacto: 'Carlos Ruiz', correo: 'rrhh@techandina.co', password: 'Empresa2026' };
const vacante = { titulo: 'Practicante de desarrollo web', descripcion: 'Apoyo al desarrollo de módulos web con React y Node.js.', modalidad: 'Híbrida', cupos: 2 };

beforeEach(() => { const db = createDb(); seedBase(db); app = createApp(db); });

async function flujoBase() {
  const e = (await request(app).post('/api/auth/registro/empresa').send(empresa)).body.token;
  const s = (await request(app).post('/api/auth/registro/estudiante').send(estudiante)).body.token;
  const c = (await request(app).post('/api/auth/login').send({ correo: 'coordinador@universidad.edu.co', password: 'Coord1234' })).body.token;
  const vac = (await request(app).post('/api/vacantes').set(auth(e)).send(vacante)).body;
  return { e, s, c, vac };
}

describe('Módulo 1: registro e inicio de sesión', () => {
  test('TI-01: registra estudiante y empresa y devuelve token', async () => {
    const a = await request(app).post('/api/auth/registro/estudiante').send(estudiante);
    const b = await request(app).post('/api/auth/registro/empresa').send(empresa);
    expect(a.status).toBe(201); expect(a.body.token).toBeTruthy();
    expect(b.status).toBe(201); expect(b.body.rol).toBe('empresa');
  });
  test('TI-02: rechaza correo duplicado y datos inválidos', async () => {
    await request(app).post('/api/auth/registro/estudiante').send(estudiante);
    expect((await request(app).post('/api/auth/registro/estudiante').send({ ...estudiante, documento: '999999999' })).status).toBe(409);
    expect((await request(app).post('/api/auth/registro/estudiante').send({ ...estudiante, correo: 'mal' })).status).toBe(400);
  });
  test('TI-03: login correcto devuelve rol y login incorrecto devuelve 401', async () => {
    await request(app).post('/api/auth/registro/estudiante').send(estudiante);
    const ok = await request(app).post('/api/auth/login').send({ correo: estudiante.correo, password: estudiante.password });
    expect(ok.status).toBe(200); expect(ok.body.rol).toBe('estudiante');
    expect((await request(app).post('/api/auth/login').send({ correo: estudiante.correo, password: 'Otra12345' })).status).toBe(401);
  });
});

describe('Módulo 2: vacantes y postulaciones', () => {
  test('TI-04: la vacante nace Pendiente y el estudiante no la ve hasta que se apruebe', async () => {
    const { s, c, vac } = await flujoBase();
    expect(vac.estado).toBe('Pendiente');
    expect((await request(app).get('/api/vacantes').set(auth(s))).body).toHaveLength(0);
    await request(app).patch(`/api/vacantes/${vac.id_vacante}/estado`).set(auth(c)).send({ estado: 'Aprobada' });
    expect((await request(app).get('/api/vacantes').set(auth(s))).body).toHaveLength(1);
  });
  test('TI-05: flujo completo de postulación y aceptación', async () => {
    const { e, s, c, vac } = await flujoBase();
    await request(app).patch(`/api/vacantes/${vac.id_vacante}/estado`).set(auth(c)).send({ estado: 'Aprobada' });
    const p = await request(app).post('/api/postulaciones').set(auth(s)).send({ id_vacante: vac.id_vacante });
    expect(p.status).toBe(201); expect(p.body.estado).toBe('Enviada');
    const lista = await request(app).get(`/api/vacantes/${vac.id_vacante}/postulaciones`).set(auth(e));
    expect(lista.body[0].nombre).toBe('Ana María Pérez');
    const acept = await request(app).patch(`/api/postulaciones/${p.body.id_postulacion}/estado`).set(auth(e)).send({ estado: 'Aceptada' });
    expect(acept.body.estado).toBe('Aceptada');
    expect((await request(app).get('/api/postulaciones/mias').set(auth(s))).body[0].estado).toBe('Aceptada');
  });
  test('TI-06: bloquea postulación duplicada y a vacantes sin aprobar', async () => {
    const { s, c, vac } = await flujoBase();
    expect((await request(app).post('/api/postulaciones').set(auth(s)).send({ id_vacante: vac.id_vacante })).status).toBe(409);
    await request(app).patch(`/api/vacantes/${vac.id_vacante}/estado`).set(auth(c)).send({ estado: 'Aprobada' });
    await request(app).post('/api/postulaciones').set(auth(s)).send({ id_vacante: vac.id_vacante });
    expect((await request(app).post('/api/postulaciones').set(auth(s)).send({ id_vacante: vac.id_vacante })).status).toBe(409);
  });
  test('TI-07: control de acceso por roles', async () => {
    const { e, s, vac } = await flujoBase();
    expect((await request(app).post('/api/vacantes').set(auth(s)).send(vacante)).status).toBe(403);
    expect((await request(app).patch(`/api/vacantes/${vac.id_vacante}/estado`).set(auth(e)).send({ estado: 'Aprobada' })).status).toBe(403);
    expect((await request(app).get('/api/vacantes')).status).toBe(401);
  });
  test('TI-08: el rechazo de una vacante exige observaciones', async () => {
    const { c, vac } = await flujoBase();
    expect((await request(app).patch(`/api/vacantes/${vac.id_vacante}/estado`).set(auth(c)).send({ estado: 'Rechazada' })).status).toBe(400);
    const ok = await request(app).patch(`/api/vacantes/${vac.id_vacante}/estado`).set(auth(c)).send({ estado: 'Rechazada', observaciones: 'Falta detallar funciones' });
    expect(ok.body.estado).toBe('Rechazada');
  });
});
