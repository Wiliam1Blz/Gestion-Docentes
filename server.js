'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('./lib/env');
const { db, transaction, audit, REGLAS, init, CFG } = require('./lib/db');
const { checkPassword, hashPassword, signToken, verifyToken } = require('./lib/auth');
const { buildXlsx } = require('./lib/xlsx');
const R = require('./lib/reportes');
const { buildZip } = require('./lib/zip');

// Configuración básica (se puede cambiar con variables de entorno)
const PORT = Number(process.env.PORT) || 3000;
const CLAVE_INICIAL = process.env.CLAVE_DEMO || 'Certus2026!';
const PUBLIC = path.join(__dirname, 'public');

const { DOMINIO, str, num, fecha, correoInstitucional, HttpError, bad, clean, periodoOk } = require('./lib/validaciones');
const {
    cumplimiento,
    resumenDocente,
    fichaData,
    statsCap,
    nuevoCodigoConstancia,
    emitirConstancia,
    sincronizarEstados,
    avg,
    resultado,
    inscritosCap,
} = require('./lib/consultas')({ db, REGLAS, crypto, fecha, HttpError });
// ------------------------------------------------------------------ Router
const routes = [];
// Registra una ruta: método, patrón (con :id), roles permitidos y la función que responde
function route(method, pattern, roles, handler) {
    const keys = [];
    const rx = new RegExp(
        '^' +
            pattern.replace(/:(\w+)/g, (_, k) => {
                keys.push(k);
                return '([^/]+)';
            }) +
            '$',
    );
    routes.push({ method, rx, keys, roles, handler });
}
// Grupos de roles. PUBLIC_ROUTE (null) significa que no pide login
const STAFF = ['admin', 'supervisor'],
    ADMIN = ['admin'],
    ANY = ['admin', 'supervisor', 'docente'],
    PUBLIC_ROUTE = null;

// Los docentes solo pueden ver su propia información; admin y supervisor ven todo
function misDatos(user, docenteId) {
    // un docente solo accede a su propia información
    if (user.rol === 'docente' && user.docente_id !== Number(docenteId)) throw new HttpError(403, 'Solo puedes ver tu propia información.');
}

// ---- Autenticación
// Guarda los intentos fallidos de login por IP + correo (en memoria)
const intentos = new Map();
route('POST', '/api/auth/login', PUBLIC_ROUTE, async (c) => {
    const email = clean(c.body.email).toLowerCase();
    const clave = String(c.body.password || '');
    const key = `${c.ip}|${email}`;
    // después de 5 fallos se bloquea 5 minutos
    const rec = intentos.get(key);
    if (rec && rec.n >= 5 && rec.hasta > Date.now()) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos e inténtalo otra vez.');
    correoInstitucional(email, 'Para ingresar, tu correo');
    const u = await db.prepare('SELECT * FROM usuarios WHERE email=?').get(email);
    // mismo mensaje si falla el correo o la clave, para no dar pistas
    if (!u || !u.activo || !checkPassword(clave, u.password_hash)) {
        intentos.set(key, { n: (rec && rec.hasta > Date.now() ? rec.n : 0) + 1, hasta: Date.now() + 5 * 60000 });
        await audit(email, 'LOGIN_FALLIDO', c.ip);
        throw new HttpError(401, 'Correo o contraseña incorrectos.');
    }
    intentos.delete(key);
    await audit(u.email, 'LOGIN', c.ip);
    return { token: signToken({ uid: u.id }), user: { id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, docente_id: u.docente_id } };
});
route('GET', '/api/auth/me', ANY, (c) => c.user);
// Registro público: SOLO crea cuentas de docente (el rol lo fija el servidor, nunca viene del formulario)
const registros = new Map();
route('POST', '/api/auth/registro', PUBLIC_ROUTE, async (c) => {
    // límite simple: 10 registros por hora desde la misma IP
    const r = registros.get(c.ip);
    if (r && r.hasta > Date.now() && r.n >= 10) throw new HttpError(429, 'Demasiados registros desde este equipo. Inténtalo más tarde.');
    registros.set(c.ip, { n: r && r.hasta > Date.now() ? r.n + 1 : 1, hasta: r && r.hasta > Date.now() ? r.hasta : Date.now() + 3600000 });
    const b = c.body;
    const email = correoInstitucional(b.email, 'Tu correo');
    const nombres = str(b, 'nombres', 'Nombres', { max: 80 });
    const apellidos = str(b, 'apellidos', 'Apellidos', { max: 80 });
    const dni = str(b, 'dni', 'DNI');
    if (!/^\d{8}$/.test(dni)) throw bad('El DNI debe tener 8 dígitos.');
    const sede = str(b, 'sede', 'Sede', { max: 60 });
    const programa = str(b, 'programa', 'Programa', { max: 120 });
    const clave = String(b.password || '');
    if (clave.length < 8 || !/[A-Za-z]/.test(clave) || !/\d/.test(clave)) throw bad('La contraseña debe tener al menos 8 caracteres, con letras y números.');
    if (b.password2 !== undefined && b.password2 !== clave) throw bad('Las contraseñas no coinciden.');
    if ((await db.prepare('SELECT 1 FROM usuarios WHERE email=?').get(email)) || (await db.prepare('SELECT 1 FROM docentes WHERE email=?').get(email)))
        throw new HttpError(409, 'Ese correo ya está registrado. Si es tuyo, ingresa con él.');
    if (await db.prepare('SELECT 1 FROM docentes WHERE dni=?').get(dni)) throw new HttpError(409, 'Ya existe un docente registrado con ese DNI.');
    return transaction(async () => {
        const n = (await db.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM docentes').get()).n;
        const ins = await db
            .prepare(
                `INSERT INTO docentes (codigo,dni,nombres,apellidos,email,sede,programa,categoria,fecha_ingreso,estado)
                 VALUES (?,?,?,?,?,?,?,'Tiempo parcial',CURDATE(),'activo')`,
            )
            .run(`DOC-${String(n).padStart(4, '0')}`, dni, nombres, apellidos, email, sede, programa);
        const docId = Number(ins.lastInsertRowid);
        const nombre = `${nombres} ${apellidos}`;
        const u = await db
            .prepare("INSERT INTO usuarios (email,nombre,rol,password_hash,docente_id) VALUES (?,?,'docente',?,?)")
            .run(email, nombre, hashPassword(clave), docId);
        await audit(email, 'REGISTRO_DOCENTE', nombre);
        return { token: signToken({ uid: Number(u.lastInsertRowid) }), user: { id: Number(u.lastInsertRowid), email, nombre, rol: 'docente', docente_id: docId } };
    });
});
route('POST', '/api/auth/cambiar-clave', ANY, async (c) => {
    const u = await db.prepare('SELECT * FROM usuarios WHERE id=?').get(c.user.id);
    if (!checkPassword(String(c.body.actual || ''), u.password_hash)) throw bad('Tu contraseña actual no coincide.');
    const n = String(c.body.nueva || '');
    if (n.length < 8 || !/[A-Za-z]/.test(n) || !/\d/.test(n))
        throw bad('La nueva contraseña debe tener al menos 8 caracteres, con letras y números.');
    await db.prepare('UPDATE usuarios SET password_hash=? WHERE id=?').run(hashPassword(n), u.id);
    await audit(u.email, 'CAMBIO_CLAVE', '');
    return { ok: true };
});

// Rutas de la API (cada archivo de lib/rutas-*.js registra las suyas con route())
const ctx = {
    ADMIN,
    ANY,
    CLAVE_INICIAL,
    HttpError,
    PUBLIC_ROUTE,
    R,
    REGLAS,
    STAFF,
    audit,
    avg,
    bad,
    buildZip,
    clean,
    correoInstitucional,
    cumplimiento,
    db,
    emitirConstancia,
    fecha,
    fichaData,
    file,
    hashPassword,
    inscritosCap,
    misDatos,
    num,
    periodoOk,
    resultado,
    route,
    statsCap,
    str,
    transaction,
};
require('./lib/rutas-panel')(ctx);
require('./lib/rutas-docentes')(ctx);
require('./lib/rutas-capacitaciones')(ctx);
// Devuelve un archivo para descargar (el servidor lo detecta con __file)
function file(buf, type, name) {
    return { __file: true, buf, type, name };
}

// Las rutas de reportes están en lib/rutas-reportes.js
require('./lib/rutas-reportes')({
    route,
    STAFF,
    ADMIN,
    ANY,
    db,
    audit,
    R,
    buildXlsx,
    HttpError,
    cumplimiento,
    fichaData,
    inscritosCap,
    misDatos,
    resumenDocente,
    statsCap,
    file,
});

// Registro de actividad (últimos 200 movimientos), solo para admin
route('GET', '/api/auditoria', ADMIN, async () => db.prepare('SELECT * FROM auditoria ORDER BY id DESC LIMIT 200').all());

// ------------------------------------------------------------------ Servidor
// Tipos de archivo para los estáticos
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.json': 'application/json',
};
// Cabeceras de seguridad que se agregan a todas las respuestas
const SEC = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
};
// Responde en JSON
const json = (res, status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC });
    res.end(JSON.stringify(obj));
};

// Lee el cuerpo de la petición; si pesa más de 1 MB se rechaza
function readBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        req.on('data', (d) => {
            size += d.length;
            if (size > 1e6) {
                reject(new HttpError(413, 'El envío es demasiado grande.'));
                req.destroy();
            } else chunks.push(d);
        });
        req.on('end', () => {
            if (!chunks.length) return resolve({});
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString()));
            } catch {
                reject(bad('No pudimos leer los datos enviados.'));
            }
        });
    });
}
// Convierte errores de MySQL en mensajes entendibles
function friendlyDbError(e) {
    const m = String(e.message);
    if (e.code === 'ER_DUP_ENTRY') {
        if (/dni/.test(m)) return 'Ya existe un docente registrado con ese DNI.';
        if (/email/.test(m)) return 'Ya existe un registro con ese correo.';
        return 'Ese registro ya existe.';
    }
    if (['ER_BAD_NULL_ERROR', 'ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2', 'ER_CHECK_CONSTRAINT_VIOLATED', 'ER_DATA_TOO_LONG', 'ER_TRUNCATED_WRONG_VALUE', 'ER_WRONG_VALUE_COUNT_ON_ROW', 'WARN_DATA_TRUNCATED'].includes(e.code))
        return 'Los datos enviados no son válidos.';
    return null;
}

// Servidor: las rutas /api/ pasan por el router (con login y permisos) y lo demás son archivos de public/
const server = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url, 'http://x');
        const p = decodeURIComponent(url.pathname);
        if (p.startsWith('/api/')) {
            await sincronizarEstados();
            // busca la ruta que coincida con el método y la URL
            const r = routes.find((x) => x.method === req.method && x.rx.test(p));
            if (!r) return json(res, 404, { error: 'No encontramos lo que buscas.' });
            const m = p.match(r.rx);
            const params = {};
            r.keys.forEach((k, i) => (params[k] = m[i + 1]));
            let user = null;
            if (r.roles) {
                // rutas protegidas: se revisa el token y que el rol tenga permiso
                const t = verifyToken((req.headers.authorization || '').replace(/^Bearer /, ''));
                const u = t && (await db.prepare('SELECT id,email,nombre,rol,docente_id,activo FROM usuarios WHERE id=?').get(t.uid));
                if (!u || !u.activo) return json(res, 401, { error: 'Tu sesión expiró. Vuelve a ingresar, por favor.' });
                if (!r.roles.includes(u.rol)) return json(res, 403, { error: 'Tu perfil no tiene permiso para esta acción.' });
                user = { ...u };
            }
            const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
            const ctx = {
                req,
                res,
                params,
                query: Object.fromEntries(url.searchParams),
                body,
                user,
                ip: req.socket.remoteAddress,
                base: process.env.BASE_URL || `http://${req.headers.host}`,
            };
            const out = await r.handler(ctx);
            if (out && out.__file) {
                res.writeHead(200, {
                    'Content-Type': out.type,
                    'Content-Disposition': `attachment; filename="${out.name}"`,
                    'Content-Length': out.buf.length,
                    'Cache-Control': 'no-store',
                    ...SEC,
                });
                return res.end(out.buf);
            }
            return json(res, 200, out);
        }
        // (el chequeo startsWith evita salirse de la carpeta public)
        // archivos estáticos
        let f = path.normalize(path.join(PUBLIC, p === '/' ? 'index.html' : p));
        if (!f.startsWith(PUBLIC)) {
            res.writeHead(403);
            return res.end();
        }
        if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('Página no encontrada');
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SEC });
        fs.createReadStream(f).pipe(res);
    } catch (e) {
        if (e instanceof HttpError) return json(res, e.status, { error: e.message });
        const f = friendlyDbError(e);
        if (f) return json(res, 409, { error: f });
        console.error(e);
        json(res, 500, { error: 'Algo salió mal de nuestro lado. Inténtalo de nuevo.' });
    }
});
// Primero se conecta a MySQL (crea la base y las tablas si faltan) y recién entonces se abre el puerto
init()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`\n  CERTUS · Gestión Docente listo en http://localhost:${PORT}`);
            console.log(`  Base de datos MySQL: ${CFG.database} en ${CFG.host}:${CFG.port}`);
            console.log(`  Dominio institucional: @${DOMINIO}  ·  Clave de demostración: ${CLAVE_INICIAL}\n`);
        });
    })
    .catch((e) => {
        const pistas = {
            ECONNREFUSED: 'MySQL no está encendido o el puerto es otro. Enciende el servicio de MySQL y revisa DB_HOST y DB_PORT en el archivo .env.',
            ER_ACCESS_DENIED_ERROR: 'Usuario o contraseña de MySQL incorrectos. Revisa DB_USER y DB_PASSWORD en el archivo .env.',
            ENOTFOUND: 'No se encontró el servidor MySQL. Revisa DB_HOST en el archivo .env.',
            MODULE_NOT_FOUND: 'Falta instalar las dependencias. Ejecuta: npm install',
        };
        console.error('\n  No se pudo iniciar la base de datos.');
        console.error('  ' + (pistas[e.code] || e.message));
        if (!pistas[e.code]) console.error(e);
        process.exit(1);
    });
