const { createDb } = require('./db');
const { seedBase } = require('./seed');
const { createApp } = require('./app');

const db = createDb(process.env.DB_PATH || 'practicas.db');
seedBase(db);
const port = process.env.PORT || 3000;
createApp(db).listen(port, () => console.log(`Plataforma de prácticas en http://localhost:${port}`));
