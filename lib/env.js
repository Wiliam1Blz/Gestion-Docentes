'use strict';
// env.js: lee el archivo .env (si existe) y lo carga en process.env. Sin dependencias (usa Node 22).
// Las variables que ya estén definidas en el sistema tienen prioridad sobre el archivo.
const path = require('path');
try {
    process.loadEnvFile(path.join(__dirname, '..', '.env'));
} catch {
    /* no hay .env: se usan los valores por defecto o las variables del sistema */
}
