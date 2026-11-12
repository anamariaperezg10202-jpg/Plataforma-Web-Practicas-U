const bcrypt = require('bcryptjs');

function seedBase(db) {
  const prog = db.prepare('INSERT OR IGNORE INTO programa (nombre) VALUES (?)');
  ['Ingeniería de Software', 'Administración de Empresas', 'Contaduría Pública'].forEach((n) => prog.run(n));
  if (!db.prepare("SELECT 1 FROM usuario WHERE rol = 'coordinador'").get()) {
    const u = db.prepare('INSERT INTO usuario (correo, contrasena_hash, rol) VALUES (?,?,?)')
      .run('coordinador@universidad.edu.co', bcrypt.hashSync('Coord1234', 10), 'coordinador');
    db.prepare('INSERT INTO coordinador (id_usuario, id_programa, nombre) VALUES (?,?,?)')
      .run(u.lastInsertRowid, 1, 'Laura Gómez (coordinadora)');
  }
}
module.exports = { seedBase };
