const { puedePostularse } = require('../../src/postulaciones');

describe('Regla de postulación a vacantes (RF-05)', () => {
  const estudiante = { semestre: 7 };
  const aprobada = { id_vacante: 1, estado: 'Aprobada' };

  test('TU-06: permite postularse a una vacante aprobada', () => {
    expect(puedePostularse({ estudiante, vacante: aprobada, yaPostulado: false })).toEqual({ ok: true });
  });

  test('TU-07: rechaza si la vacante está pendiente o no existe', () => {
    expect(puedePostularse({ estudiante, vacante: { estado: 'Pendiente' }, yaPostulado: false }).codigo).toBe(409);
    expect(puedePostularse({ estudiante, vacante: undefined, yaPostulado: false }).codigo).toBe(404);
  });

  test('TU-08: evita postulaciones duplicadas', () => {
    const r = puedePostularse({ estudiante, vacante: aprobada, yaPostulado: true });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/Ya te postulaste/);
  });

  test('TU-09: exige el semestre mínimo', () => {
    const r = puedePostularse({ estudiante: { semestre: 4 }, vacante: aprobada, yaPostulado: false });
    expect(r.codigo).toBe(422);
  });
});
