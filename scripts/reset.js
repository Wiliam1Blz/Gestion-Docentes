'use strict';
// reset.js: borra las tablas de la aplicación. Al volver a iniciar el servidor se recrean con los datos de demostración.
require('../lib/env');
const mysql = require('mysql2/promise');

const TABLAS = ['auditoria', 'inscripciones', 'capacitaciones', 'supervisiones', 'encuestas', 'evaluaciones', 'usuarios', 'docentes'];

(async () => {
    const base = process.env.DB_NAME || 'certus_docente';
    const c = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: base,
        ssl: /^(1|true|yes)$/i.test(process.env.DB_SSL || '') ? { minVersion: 'TLSv1.2', rejectUnauthorized: true } : undefined,
    });
    await c.query('SET FOREIGN_KEY_CHECKS=0');
    for (const t of TABLAS) await c.query(`DROP TABLE IF EXISTS \`${t}\``);
    await c.query('SET FOREIGN_KEY_CHECKS=1');
    await c.end();
    console.log(`Tablas de "${base}" borradas. Se volverán a crear y llenar con datos de demostración al iniciar el servidor.`);
})().catch((e) => {
    console.error('No se pudo reiniciar la base de datos:', e.code === 'ER_BAD_DB_ERROR' ? 'la base aún no existe (inicia el servidor una vez).' : e.message);
    process.exit(1);
});
