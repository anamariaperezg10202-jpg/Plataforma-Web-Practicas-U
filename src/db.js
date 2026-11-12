const Database = require('better-sqlite3');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS programa (
  id_programa INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  correo TEXT NOT NULL UNIQUE,
  contrasena_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('estudiante','empresa','coordinador')),
  estado TEXT NOT NULL DEFAULT 'activo'
);
CREATE TABLE IF NOT EXISTS estudiante (
  id_estudiante INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario INTEGER NOT NULL UNIQUE REFERENCES usuario(id_usuario),
  id_programa INTEGER NOT NULL REFERENCES programa(id_programa),
  documento TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  semestre INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS empresa (
  id_empresa INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario INTEGER NOT NULL UNIQUE REFERENCES usuario(id_usuario),
  nit TEXT NOT NULL UNIQUE,
  razon_social TEXT NOT NULL,
  contacto TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coordinador (
  id_coordinador INTEGER PRIMARY KEY AUTOINCREMENT,
  id_usuario INTEGER NOT NULL UNIQUE REFERENCES usuario(id_usuario),
  id_programa INTEGER REFERENCES programa(id_programa),
  nombre TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS vacante (
  id_vacante INTEGER PRIMARY KEY AUTOINCREMENT,
  id_empresa INTEGER NOT NULL REFERENCES empresa(id_empresa),
  id_programa INTEGER REFERENCES programa(id_programa),
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  modalidad TEXT NOT NULL DEFAULT 'Presencial',
  cupos INTEGER NOT NULL DEFAULT 1,
  fecha_publicacion TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','Aprobada','Rechazada')),
  observaciones TEXT
);
CREATE TABLE IF NOT EXISTS postulacion (
  id_postulacion INTEGER PRIMARY KEY AUTOINCREMENT,
  id_estudiante INTEGER NOT NULL REFERENCES estudiante(id_estudiante),
  id_vacante INTEGER NOT NULL REFERENCES vacante(id_vacante),
  fecha TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Enviada' CHECK (estado IN ('Enviada','Aceptada','Rechazada')),
  UNIQUE (id_estudiante, id_vacante)
);
`;

function createDb(file = ':memory:') {
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

module.exports = { createDb };
