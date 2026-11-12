const v = require('../../src/validators');

describe('Validaciones de registro (RF-01)', () => {
  test('TU-01: acepta correos válidos y rechaza inválidos', () => {
    expect(v.validarCorreo('ana@soyucn.edu.co')).toBe(true);
    expect(v.validarCorreo('ana@@soyucn')).toBe(false);
    expect(v.validarCorreo('')).toBe(false);
  });

  test('TU-02: la contraseña exige 8 caracteres, letras y números', () => {
    expect(v.validarPassword('Clave1234')).toBe(true);
    expect(v.validarPassword('corta1')).toBe(false);
    expect(v.validarPassword('solo letras largas')).toBe(false);
  });

  test('TU-03: el NIT acepta 9 dígitos con verificador opcional', () => {
    expect(v.validarNit('900123456-7')).toBe(true);
    expect(v.validarNit('900123456')).toBe(true);
    expect(v.validarNit('12345')).toBe(false);
  });

  test('TU-04: el registro de estudiante devuelve los errores encontrados', () => {
    const errores = v.validarRegistroEstudiante({ nombre: 'A', documento: '12', correo: 'x', password: '1', id_programa: 'a', semestre: 20 });
    expect(errores).toHaveLength(6);
    const ok = v.validarRegistroEstudiante({ nombre: 'Ana Pérez', documento: '1037000111', correo: 'ana@soyucn.edu.co', password: 'Clave1234', id_programa: 1, semestre: 7 });
    expect(ok).toEqual([]);
  });

  test('TU-05: la vacante exige título, descripción, modalidad y cupos', () => {
    expect(v.validarVacante({ titulo: 'Dev', descripcion: 'corta', modalidad: 'X', cupos: 0 })).toHaveLength(4);
    expect(v.validarVacante({ titulo: 'Practicante de desarrollo web', descripcion: 'Apoyo al desarrollo de módulos web con React y Node.', modalidad: 'Híbrida', cupos: 2 })).toEqual([]);
  });
});
