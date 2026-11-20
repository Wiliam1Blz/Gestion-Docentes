'use strict';
// validaciones.js - error con código HTTP y funciones para validar lo que llega de los formularios.
const DOMINIO = (process.env.DOMINIO_INSTITUCIONAL || 'certus.edu.pe').toLowerCase();

// Error con código HTTP para responder al usuario con un mensaje claro (400, 403, 404...)
class HttpError extends Error {
    constructor(status, msg) {
        super(msg);
        this.status = status;
    }
}
const bad = (m) => new HttpError(400, m);

// ------------------------------------------------------------------ Validaciones
// quita espacios y evita null/undefined
const clean = (v) => (v == null ? '' : String(v).trim());
// Valida un texto: obligatorio y con largo máximo
function str(b, k, label, { req = true, max = 200 } = {}) {
    const v = clean(b[k]);
    if (req && !v) throw bad(`Falta completar: ${label}.`);
    if (v.length > max) throw bad(`${label} es demasiado largo (máximo ${max} caracteres).`);
    return v;
}
// Valida un número dentro de un rango
function num(b, k, label, min, max, { req = true } = {}) {
    if (b[k] === '' || b[k] == null) {
        if (req) throw bad(`Falta completar: ${label}.`);
        return null;
    }
    const n = Number(b[k]);
    if (!Number.isFinite(n) || n < min || n > max) throw bad(`${label} debe estar entre ${min} y ${max}.`);
    return n;
}
// Valida que la fecha tenga formato AAAA-MM-DD y sea real
function fecha(b, k, label, { req = true } = {}) {
    const v = clean(b[k]);
    if (!v) {
        if (req) throw bad(`Falta completar: ${label}.`);
        return null;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || isNaN(Date.parse(v))) throw bad(`${label} no es una fecha válida.`);
    return v;
}
// Solo se aceptan correos del dominio de la institución
function correoInstitucional(v, label = 'El correo') {
    v = clean(v).toLowerCase();
    if (!new RegExp(`^[a-z0-9._-]+@${DOMINIO.replace(/\./g, '\\.')}$`).test(v))
        throw bad(`${label} debe ser institucional (termina en @${DOMINIO}).`);
    return v;
}
// El periodo debe tener el formato 2026-I o 2026-II
const periodoOk = (v) => {
    v = clean(v).toUpperCase();
    if (!/^\d{4}-(I|II)$/.test(v)) throw bad('El periodo debe tener formato 2026-I o 2026-II.');
    return v;
};

module.exports = { DOMINIO, str, num, fecha, correoInstitucional, HttpError, bad, clean, periodoOk };
