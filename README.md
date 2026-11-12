# Plataforma de Prácticas Profesionales (prototipo)

Prototipo funcional del Taller 3 de Ingeniería de Software. Centraliza el proceso de prácticas profesionales: registro de estudiantes y empresas, publicación y aprobación de vacantes y postulación.

## Módulos implementados
1. **Registro e inicio de sesión** (RF-01): estudiantes y empresas, con contraseñas cifradas (bcrypt) y sesión con JWT.
2. **Vacantes y postulaciones** (RF-02 a RF-07 parcial): la empresa publica, el coordinador aprueba o rechaza, el estudiante se postula y la empresa acepta o rechaza.

## Tecnologías
Node.js 22 · Express · SQLite (better-sqlite3) · JavaScript en el navegador · Jest y Supertest para las pruebas.

## Ejecución local
```bash
npm install
npm start            # http://localhost:3000
```
Usuario coordinador de prueba: `coordinador@universidad.edu.co` / `Coord1234`.
Para cargar datos de ejemplo con el servidor encendido: `node scripts/demo.js http://localhost:3000`.

## Pruebas
```bash
npm test                      # unitarias + integración
npm test -- --coverage        # con cobertura
```

## Despliegue
Incluye `Dockerfile`. Variables: `PORT`, `JWT_SECRET` (obligatoria en producción) y `DB_PATH`.

## Estructura
```
src/        db.js (esquema) · validators.js · postulaciones.js (regla) · app.js (API) · server.js
public/     interfaz web (HTML, CSS, JS)
tests/      unit/ e integration/
scripts/    demo.js (datos de ejemplo)
```
