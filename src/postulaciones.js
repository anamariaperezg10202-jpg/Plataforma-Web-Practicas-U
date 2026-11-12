const SEMESTRE_MINIMO = 6;

/** Regla de negocio (RF-05): decide si un estudiante puede postularse a una vacante. */
function puedePostularse({ estudiante, vacante, yaPostulado, semestreMinimo = SEMESTRE_MINIMO }) {
  if (!vacante) return { ok: false, codigo: 404, motivo: 'La vacante no existe.' };
  if (vacante.estado !== 'Aprobada') return { ok: false, codigo: 409, motivo: 'La vacante aún no está aprobada.' };
  if (yaPostulado) return { ok: false, codigo: 409, motivo: 'Ya te postulaste a esta vacante.' };
  if (estudiante.semestre < semestreMinimo) {
    return { ok: false, codigo: 422, motivo: `Se requiere mínimo ${semestreMinimo}.º semestre para postularse.` };
  }
  return { ok: true };
}

module.exports = { puedePostularse, SEMESTRE_MINIMO };
