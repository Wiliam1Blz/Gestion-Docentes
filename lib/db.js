'use strict';
// db.js: conexión a MySQL (mysql2), creación de tablas, reglas de aprobación y datos de demostración.
// Todas las consultas son asíncronas: usa `await db.prepare(sql).get(...)`, `.all(...)` o `.run(...)`.
require('./env');
let mysql;
try {
    mysql = require('mysql2/promise');
} catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
    console.error('\n  Falta instalar las dependencias. Ejecuta en la carpeta del proyecto:  npm install\n');
    process.exit(1);
}
const { AsyncLocalStorage } = require('node:async_hooks');
const path = require('path');
const fs = require('fs');
const { hashPassword } = require('./auth');

// Datos de conexión: salen del archivo .env (ver .env.example)
const CFG = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'certus_docente',
};
// TiDB Cloud (y la mayoría de MySQL en la nube) exige conexión cifrada: pon DB_SSL=true en las variables de entorno
if (/^(1|true|yes)$/i.test(process.env.DB_SSL || '')) CFG.ssl = { minVersion: 'TLSv1.2', rejectUnauthorized: true };
if (!/^[A-Za-z0-9_]+$/.test(CFG.database)) throw new Error('DB_NAME solo puede tener letras, números y guion bajo.');

let pool = null;
// Guarda la conexión de la transacción en curso, para que todas las consultas de esa operación la compartan
const txStore = new AsyncLocalStorage();
const conn = () => txStore.getStore() || pool;

// MySQL devuelve SUM/AVG como DECIMAL (texto): aquí lo volvemos número para que el resto del código no cambie
function typeCast(field, next) {
    if (field.type === 'NEWDECIMAL' || field.type === 'DECIMAL') {
        const v = field.string();
        return v === null ? null : Number(v);
    }
    return next();
}

// Interfaz parecida a la que se usaba con SQLite, pero con promesas
const db = {
    prepare(sql) {
        return {
            all: async (...args) => (await conn().query(sql, args))[0],
            get: async (...args) => (await conn().query(sql, args))[0][0],
            run: async (...args) => {
                const [r] = await conn().query(sql, args);
                return { lastInsertRowid: r.insertId, changes: r.affectedRows };
            },
        };
    },
    exec: async (sql) => {
        await conn().query(sql);
    },
};

// Crea la base (si no existe), el pool de conexiones y las tablas. Hay que llamarla antes de atender peticiones.
async function connect() {
    // En TiDB Cloud la base ya existe y el usuario no siempre puede crearla: si falla, seguimos con la que hay.
    if (!/^(1|true|yes)$/i.test(process.env.DB_SKIP_CREATE || '')) {
        try {
            const boot = await mysql.createConnection({ host: CFG.host, port: CFG.port, user: CFG.user, password: CFG.password, ssl: CFG.ssl });
            await boot.query(`CREATE DATABASE IF NOT EXISTS \`${CFG.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await boot.end();
        } catch (e) {
            if (e.code !== 'ER_DBACCESS_DENIED_ERROR' && e.code !== 'ER_SPECIFIC_ACCESS_DENIED_ERROR') throw e;
            console.warn('  Aviso: no se pudo crear la base (sin permiso); se usará la existente.');
        }
    }
    pool = mysql.createPool({
        ...CFG,
        waitForConnections: true,
        connectionLimit: 10,
        charset: 'utf8mb4',
        dateStrings: true, // las fechas llegan como texto 'AAAA-MM-DD', igual que antes
        typeCast,
    });
    const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
    const sentencias = sql
        .split('\n')
        .filter((l) => !l.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map((s) => s.trim())
        .filter(Boolean);
    for (const s of sentencias) await pool.query(s);
}

// Regla de negocio: asistencia mínima y nota mínima para aprobar
const REGLAS = { asistenciaMin: 80, notaMin: 13 };

// Ejecuta varias operaciones juntas: si una falla se deshace todo (ROLLBACK)
async function transaction(fn) {
    if (txStore.getStore()) return fn(); // ya estamos dentro de una transacción
    const c = await pool.getConnection();
    try {
        await c.beginTransaction();
        const r = await txStore.run(c, fn);
        await c.commit();
        return r;
    } catch (e) {
        try {
            await c.rollback();
        } catch {
            /* la conexión ya estaba cerrada */
        }
        throw e;
    } finally {
        c.release();
    }
}
// Guarda en la tabla auditoria quién hizo qué
async function audit(usuario, accion, detalle) {
    await db.prepare('INSERT INTO auditoria (usuario, accion, detalle) VALUES (?,?,?)').run(usuario || 'sistema', accion, detalle || '');
}

// ---------------------------------------------------------------- Datos de demostración
// Llena la base con datos de prueba solo la primera vez (si ya hay usuarios no hace nada)
async function seed() {
    if ((await db.prepare('SELECT COUNT(*) n FROM usuarios').get()).n > 0) return false;
    // Generador de números aleatorios con semilla fija, así los datos de demo son siempre los mismos
    let s = 20261030;
    const rnd = () => {
        s |= 0;
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const between = (a, b, d = 1) => +(a + rnd() * (b - a)).toFixed(d);
    const norm = (t) =>
        t
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/[^a-z]/g, '');
    const CLAVE = process.env.CLAVE_DEMO || 'Certus2026!';
    const dom = process.env.DOMINIO_INSTITUCIONAL || 'certus.edu.pe';

    // Listas base para inventar docentes, cursos y capacitaciones
    const sedes = ['Lima Centro', 'Lima Norte', 'Arequipa', 'Trujillo', 'Piura'];
    const programas = [
        'Diseño y Desarrollo de Software',
        'Administración de Sistemas para la Transformación Digital',
        'Administración de Empresas',
        'Contabilidad',
        'Marketing Digital',
        'Enfermería Técnica',
    ];
    const cursosPorPrograma = {
        [programas[0]]: ['Programación Web', 'Base de Datos', 'Algoritmos', 'Ingeniería de Software'],
        [programas[1]]: ['Redes y Conectividad', 'Soporte Técnico', 'Sistemas Operativos', 'Seguridad Informática'],
        [programas[2]]: ['Gestión Empresarial', 'Finanzas Básicas', 'Liderazgo'],
        [programas[3]]: ['Contabilidad General', 'Costos', 'Tributación'],
        [programas[4]]: ['Marketing Digital', 'Redes Sociales', 'Analítica Web'],
        [programas[5]]: ['Anatomía', 'Primeros Auxilios', 'Cuidados Básicos'],
    };
    const grados = ['Bachiller', 'Licenciado', 'Magíster', 'Magíster', 'Doctor'];
    const personas = [
        ['Carlos Alberto', 'Ramírez Quispe'],
        ['María Fernanda', 'Torres Huamán'],
        ['José Luis', 'Mendoza Paredes'],
        ['Lucía Beatriz', 'Salazar Rojas'],
        ['Jorge Armando', 'Flores Chávez'],
        ['Rosa Elena', 'Cárdenas Vega'],
        ['Miguel Ángel', 'Gutiérrez Soto'],
        ['Patricia', 'Villanueva Díaz'],
        ['Andrés Felipe', 'Castillo Rivas'],
        ['Karen Milagros', 'Paredes Linares'],
        ['Luis Enrique', 'Alva Ccori'],
        ['Diana Carolina', 'Núñez Bravo'],
        ['Héctor Raúl', 'Medina Zavala'],
        ['Silvia Marlene', 'Campos Ortega'],
        ['Ricardo', 'Espinoza Tapia'],
        ['Gladys', 'Huamaní Mamani'],
    ];

    await transaction(async () => {
        const insDoc = db.prepare(
            `INSERT INTO docentes (codigo,dni,nombres,apellidos,email,telefono,direccion,fecha_nacimiento,sede,programa,categoria,grado_academico,especialidad,fecha_ingreso,estado,observaciones) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        );
        const insUsr = db.prepare('INSERT INTO usuarios (email,nombre,rol,password_hash,docente_id) VALUES (?,?,?,?,?)');
        const hash = hashPassword(CLAVE);
        await insUsr.run(`gestion.docente@${dom}`, 'Equipo de Gestión Docente', 'admin', hash, null);
        await insUsr.run(`supervision@${dom}`, 'Coordinación Académica', 'supervisor', hash, null);

        const docs = [];
        for (const [i, [nom, ape]] of personas.entries()) {
            const prog = programas[i % programas.length];
            const email = `${norm(nom.split(' ')[0])}.${norm(ape.split(' ')[0])}@${dom}`;
            const estado = i === 15 ? 'inactivo' : 'activo';
            const r = await insDoc.run(
                `DOC-${String(i + 1).padStart(4, '0')}`,
                String(40000000 + Math.floor(rnd() * 9999999)),
                nom,
                ape,
                email,
                '9' + String(10000000 + Math.floor(rnd() * 89999999)),
                `Av. ${pick(['Los Olivos', 'La Marina', 'Arequipa', 'Brasil', 'Javier Prado', 'Grau'])} ${100 + Math.floor(rnd() * 900)}`,
                `19${70 + Math.floor(rnd() * 28)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
                sedes[i % sedes.length],
                prog,
                i % 3 === 0 ? 'Tiempo completo' : 'Tiempo parcial',
                pick(grados),
                prog.split(' ').slice(0, 3).join(' '),
                `20${15 + Math.floor(rnd() * 10)}-0${1 + Math.floor(rnd() * 8)}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
                estado,
                i === 15 ? 'Licencia por estudios de posgrado.' : '',
            );
            const id = Number(r.lastInsertRowid);
            docs.push({ id, prog, estado, nombre: `${nom} ${ape}`, skill: between(0.55, 1, 2) });
            await insUsr.run(email, `${nom} ${ape}`, 'docente', hash, id);
        }

        const insEv = db.prepare('INSERT INTO evaluaciones (docente_id,periodo,puntaje,evaluador,comentario) VALUES (?,?,?,?,?)');
        const insEn = db.prepare('INSERT INTO encuestas (docente_id,periodo,curso,respuestas,puntaje,comentario) VALUES (?,?,?,?,?,?)');
        const insSu = db.prepare(
            'INSERT INTO supervisiones (docente_id,fecha,curso,supervisor,puntaje,fortalezas,oportunidades,compromisos) VALUES (?,?,?,?,?,?,?,?)',
        );
        const comentarios = [
            'Buen dominio del tema y trato cordial con los estudiantes.',
            'Muestra compromiso; puede reforzar la planificación de sesiones.',
            'Excelente manejo de recursos digitales.',
            'Cumple con lo esperado; se sugiere más actividades colaborativas.',
        ];
        const fort = [
            'Clases ordenadas y con objetivos claros.',
            'Buena comunicación y empatía con el grupo.',
            'Uso efectivo de ejemplos reales del sector.',
        ];
        const opor = [
            'Dar retroalimentación más oportuna.',
            'Variar las dinámicas para sostener la atención.',
            'Aprovechar mejor el tiempo de cierre de la sesión.',
        ];
        const comp = [
            'Incorporar una rúbrica en la próxima práctica.',
            'Asistir al taller de retroalimentación efectiva.',
            'Compartir materiales en el aula virtual antes de cada clase.',
        ];
        // Evaluaciones, encuestas y supervisiones por docente (el nivel de 'skill' hace que unos salgan mejor que otros)
        for (const d of docs) {
            for (const [pi, p] of ['2026-I', '2026-II'].entries()) {
                if (d.id === docs[14].id && pi === 1) continue; // docente sin evaluación aún (para alertas)
                await insEv.run(
                    d.id,
                    p,
                    +Math.min(20, between(11.5, 15.5, 1) + d.skill * 4 + pi * 0.3).toFixed(1),
                    'Coordinación Académica',
                    pick(comentarios),
                );
                const cursos = cursosPorPrograma[d.prog];
                for (let k = 0; k < 2; k++)
                    await insEn.run(
                        d.id,
                        p,
                        cursos[(k + pi) % cursos.length],
                        12 + Math.floor(rnd() * 25),
                        +Math.min(5, between(3.0, 4.2, 1) + d.skill * 0.7).toFixed(1),
                        rnd() > 0.6 ? 'Estudiantes valoran la claridad de las explicaciones.' : '',
                    );
            }
            const nSup = 1 + Math.floor(rnd() * 2);
            for (let k = 0; k < nSup; k++) {
                const cursos = cursosPorPrograma[d.prog];
                await insSu.run(
                    d.id,
                    `2026-${String(4 + k * 3).padStart(2, '0')}-${String(5 + Math.floor(rnd() * 20)).padStart(2, '0')}`,
                    cursos[k % cursos.length],
                    'Coordinación Académica',
                    +Math.min(20, between(11, 16, 1) + d.skill * 3.5).toFixed(1),
                    pick(fort),
                    pick(opor),
                    pick(comp),
                );
            }
        }

        const insCap = db.prepare(
            'INSERT INTO capacitaciones (titulo,descripcion,modalidad,horas,fecha_inicio,fecha_fin,instructor,cupo,obligatoria,estado) VALUES (?,?,?,?,?,?,?,?,?,?)',
        );
        // Capacitaciones de ejemplo: título, descripción, modalidad, horas, fechas, instructor, cupo, obligatoria, estado
        const caps = [
            [
                'Metodologías activas en el aula virtual',
                'Estrategias para sesiones participativas: aprendizaje basado en retos, aula invertida y trabajo colaborativo.',
                'Virtual',
                8,
                '2026-03-09',
                '2026-03-27',
                'Mg. Teresa Lozano',
                20,
                1,
                'finalizada',
            ],
            [
                'Uso del campus virtual y Microsoft Teams',
                'Gestión de aulas, publicación de materiales, foros y evaluaciones en línea.',
                'Virtual',
                6,
                '2026-04-13',
                '2026-04-24',
                'Ing. Pablo Arias',
                20,
                1,
                'finalizada',
            ],
            [
                'Evaluación por competencias',
                'Diseño de rúbricas, instrumentos de evaluación y retroalimentación formativa.',
                'Presencial',
                12,
                '2026-06-01',
                '2026-06-19',
                'Dra. Carmen Ugarte',
                16,
                0,
                'finalizada',
            ],
            [
                'Prevención del acoso y buen trato en la comunidad educativa',
                'Protocolos institucionales, detección temprana y canales de atención.',
                'Virtual',
                4,
                '2026-08-17',
                '2026-08-28',
                'Lic. Verónica Salas',
                20,
                1,
                'finalizada',
            ],
            [
                'Inteligencia artificial en la docencia',
                'Uso responsable de herramientas de IA para planificar, evaluar y acompañar el aprendizaje.',
                'Virtual',
                10,
                '2026-10-12',
                '2026-11-20',
                'Mg. Daniel Rivera',
                20,
                0,
                'en_curso',
            ],
            [
                'Retroalimentación efectiva',
                'Técnicas para dar feedback claro, empático y accionable a estudiantes.',
                'Presencial',
                6,
                '2026-11-16',
                '2026-12-04',
                'Dra. Carmen Ugarte',
                20,
                0,
                'programada',
            ],
        ];
        const capIds = [];
        for (const c of caps) capIds.push(Number((await insCap.run(...c)).lastInsertRowid));
        const insIn = db.prepare(
            'INSERT INTO inscripciones (capacitacion_id,docente_id,estado,asistencia,nota,fecha_inscripcion,constancia_codigo,constancia_fecha) VALUES (?,?,?,?,?,?,?,?)',
        );
        const activos = docs.filter((d) => d.estado === 'activo');
        let seq = 1;
        const code = (cid) =>
            `CERT-CAP-2026-${String(cid).padStart(3, '0')}-${String(seq++).padStart(4, '0')}${Math.floor(rnd() * 16)
                .toString(16)
                .toUpperCase()}${Math.floor(rnd() * 16)
                .toString(16)
                .toUpperCase()}`;
        // Inscripciones: en las finalizadas se calcula aprobado/desaprobado con las REGLAS; en las demás solo 'inscrito'
        for (const [ci, c] of caps.entries()) {
            const cid = capIds[ci];
            for (const d of activos) {
                const prob = c[8] ? 0.95 : 0.5;
                if (rnd() > prob) continue;
                if (c[9] === 'finalizada') {
                    const asis = Math.round(100 - Math.pow(rnd(), 4) * 30);
                    const nota = Math.round(20 - Math.pow(rnd(), 2.5) * 9);
                    const ok = asis >= REGLAS.asistenciaMin && nota >= REGLAS.notaMin;
                    const emitida = ok && ci !== 3; // la de acoso queda con constancias por emitir (demo del botón)
                    await insIn.run(
                        cid,
                        d.id,
                        ok ? 'aprobado' : 'desaprobado',
                        asis,
                        nota,
                        c[4].slice(0, 8) + '01',
                        emitida ? code(cid) : null,
                        emitida ? c[5] : null,
                    );
                } else await insIn.run(cid, d.id, 'inscrito', null, null, '2026-10-01', null, null);
            }
        }
        await audit('sistema', 'SEMILLA', 'Datos de demostración cargados');
    });
    return true;
}
// Conecta, crea las tablas y carga los datos de demostración la primera vez (si ya hay usuarios no hace nada)
async function init() {
    await connect();
    await seed();
}
module.exports = { db, transaction, audit, REGLAS, init, CFG, getPool: () => pool };
