// Carga datos de ejemplo contra un servidor en ejecución: node scripts/demo.js http://localhost:3000
const base = process.argv[2] || 'http://localhost:3000';
const post = async (ruta, body, token, metodo = 'POST') => {
  const r = await fetch(base + '/api' + ruta, { method: metodo, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
  return r.json();
};
(async () => {
  const emp = await post('/auth/registro/empresa', { razon_social: 'Tech Andina SAS', nit: '900123456-7', contacto: 'Carlos Ruiz', correo: 'rrhh@techandina.co', password: 'Empresa2026' });
  const est = await post('/auth/registro/estudiante', { nombre: 'Ana María Pérez', documento: '1037000111', correo: 'ana@soyucn.edu.co', password: 'Clave1234', id_programa: 1, semestre: 7 });
  const coord = await post('/auth/login', { correo: 'coordinador@universidad.edu.co', password: 'Coord1234' });
  const vacs = [
    { titulo: 'Practicante de desarrollo web', descripcion: 'Apoyo al desarrollo de módulos web con React y Node.js, bajo la guía de un ingeniero senior.', modalidad: 'Híbrida', cupos: 2, id_programa: 1 },
    { titulo: 'Practicante de aseguramiento de calidad', descripcion: 'Diseño y ejecución de casos de prueba funcionales y automatizados para aplicaciones web.', modalidad: 'Remota', cupos: 1, id_programa: 1 },
    { titulo: 'Practicante de análisis de datos', descripcion: 'Limpieza de datos y construcción de tableros de indicadores para el área comercial.', modalidad: 'Presencial', cupos: 1, id_programa: 1 },
  ];
  const ids = [];
  for (const v of vacs) ids.push((await post('/vacantes', v, emp.token)).id_vacante);
  await post(`/vacantes/${ids[0]}/estado`, { estado: 'Aprobada' }, coord.token, 'PATCH');
  await post(`/vacantes/${ids[1]}/estado`, { estado: 'Aprobada' }, coord.token, 'PATCH');
  console.log('Datos de ejemplo cargados', { empresa: emp.rol, estudiante: est.rol, vacantes: ids });
})();
