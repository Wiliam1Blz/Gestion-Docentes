'use strict';
// auth.js: contraseñas (scrypt) y tokens de sesión firmados con HMAC. Todo con el módulo crypto de Node.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
// La clave secreta para firmar tokens: viene de una variable de entorno o se genera una sola vez y se guarda en data/
const keyFile = path.join(DATA_DIR, 'secret.key');
let SECRET = process.env.SECRETO_SESION;
if (!SECRET) {
    if (!fs.existsSync(keyFile)) fs.writeFileSync(keyFile, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
    SECRET = fs.readFileSync(keyFile, 'utf8');
}

// Guardamos la contraseña como salt:hash. Nunca se guarda en texto plano.
function hashPassword(pw) {
    const salt = crypto.randomBytes(16).toString('hex');
    return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}
// Vuelve a calcular el hash con el mismo salt y compara (timingSafeEqual evita ataques por tiempo).
function checkPassword(pw, stored) {
    const [salt, hash] = String(stored).split(':');
    if (!salt || !hash) return false;
    const a = Buffer.from(hash, 'hex');
    const b = crypto.scryptSync(pw, salt, 64);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
// Token = datos en base64 + firma. Si alguien cambia los datos, la firma ya no coincide.
const b64 = (b) => Buffer.from(b).toString('base64url');
function signToken(payload, ttlSeconds = 8 * 3600) {
    const body = b64(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
    const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    return `${body}.${sig}`;
}
// Devuelve los datos del token si la firma es correcta y no ha vencido; si no, null.
function verifyToken(token) {
    if (!token || !token.includes('.')) return null;
    const [body, sig] = token.split('.');
    const exp = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
    const a = Buffer.from(sig),
        b = Buffer.from(exp);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    try {
        const p = JSON.parse(Buffer.from(body, 'base64url').toString());
        return p.exp > Date.now() / 1000 ? p : null;
    } catch {
        return null;
    }
}
module.exports = { hashPassword, checkPassword, signToken, verifyToken };
