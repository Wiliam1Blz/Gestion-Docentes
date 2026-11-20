'use strict';
// rutas-docentes.js - rutas de la API: docentes, evaluaciones, encuestas y supervisiones. Salió de server.js para que no fuera tan largo.
module.exports = function rutasDocentes({
    db,
    transaction,
    audit,
    hashPassword,
    CLAVE_INICIAL,
    str,
    num,
    fecha,
    correoInstitucional,
    HttpError,
    bad,
    periodoOk,
    fichaData,
    route,
    STAFF,
    ADMIN,
    ANY,
    misDatos,
}) {
    // ---- Docentes
    route('GET', '/api/docentes', STAFF, async (c) => {
        const { q = '', sede = '', programa = '', estado = '' } = c.query;
        const where = [];
        const args = [];
        if (q) {
            where.push("CONCAT_WS(' ', d.nombres, d.apellidos, d.email, d.dni, d.codigo) LIKE ?");
            args.push(`%${q}%`);
        }
        if (sede) {
            where.push('d.sede=?');
            args.push(sede);
        }
        if (programa) {
            where.push('d.programa=?');
            args.push(programa);
        }
        if (estado) {
            where.push('d.estado=?');
            args.push(estado);
        }
        return db
            .prepare(
                `SELECT d.*, (SELECT puntaje FROM evaluaciones e WHERE e.docente_id=d.id ORDER BY periodo DESC LIMIT 1) ultima_eval,
        (SELECT COALESCE(SUM(c.horas),0) FROM inscripciones i JOIN capacitaciones c ON c.id=i.capacitacion_id WHERE i.docente_id=d.id AND i.estado='aprobado') horas
        FROM docentes d ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY d.apellidos, d.nombres`,
            )
            .all(...args);
    });
    route('GET', '/api/docentes/filtros', STAFF, async () => ({
        sedes: (await db.prepare('SELECT DISTINCT sede v FROM docentes ORDER BY v').all()).map((r) => r.v),
        programas: (await db.prepare('SELECT DISTINCT programa v FROM docentes ORDER BY v').all()).map((r) => r.v),
    }));
    // Valida y ordena los campos del formulario de docente (se usa al crear y al editar)
    function docenteCampos(b) {
        return {
            nombres: str(b, 'nombres', 'Nombres', { max: 80 }),
            apellidos: str(b, 'apellidos', 'Apellidos', { max: 80 }),
            dni: (() => {
                const v = str(b, 'dni', 'DNI');
                if (!/^\d{8}$/.test(v)) throw bad('El DNI debe tener 8 dígitos.');
                return v;
            })(),
            email: correoInstitucional(b.email, 'El correo del docente'),
            telefono: str(b, 'telefono', 'Teléfono', { req: false, max: 20 }),
            direccion: str(b, 'direccion', 'Dirección', { req: false }),
            fecha_nacimiento: fecha(b, 'fecha_nacimiento', 'La fecha de nacimiento', { req: false }),
            sede: str(b, 'sede', 'Sede', { max: 60 }),
            programa: str(b, 'programa', 'Programa', { max: 120 }),
            categoria: ['Tiempo completo', 'Tiempo parcial'].includes(b.categoria) ? b.categoria : 'Tiempo parcial',
            grado_academico: str(b, 'grado_academico', 'Grado académico', { req: false, max: 60 }),
            especialidad: str(b, 'especialidad', 'Especialidad', { req: false, max: 120 }),
            fecha_ingreso: fecha(b, 'fecha_ingreso', 'La fecha de ingreso', { req: false }),
            observaciones: str(b, 'observaciones', 'Observaciones', { req: false, max: 1000 }),
        };
    }
    route('POST', '/api/docentes', ADMIN, async (c) => {
        const d = docenteCampos(c.body);
        return transaction(async () => {
            const n = (await db.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM docentes').get()).n;
            const r = await db
                .prepare(
                    `INSERT INTO docentes (codigo,dni,nombres,apellidos,email,telefono,direccion,fecha_nacimiento,sede,programa,categoria,grado_academico,especialidad,fecha_ingreso,observaciones,estado)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'activo')`,
                )
                .run(
                    `DOC-${String(n).padStart(4, '0')}`,
                    d.dni,
                    d.nombres,
                    d.apellidos,
                    d.email,
                    d.telefono,
                    d.direccion,
                    d.fecha_nacimiento,
                    d.sede,
                    d.programa,
                    d.categoria,
                    d.grado_academico,
                    d.especialidad,
                    d.fecha_ingreso,
                    d.observaciones,
                );
            const id = Number(r.lastInsertRowid);
            await db.prepare("INSERT INTO usuarios (email,nombre,rol,password_hash,docente_id) VALUES (?,?,'docente',?,?)").run(
                d.email,
                `${d.nombres} ${d.apellidos}`,
                hashPassword(CLAVE_INICIAL),
                id,
            );
            await audit(c.user.email, 'DOCENTE_CREADO', `${d.nombres} ${d.apellidos}`);
            return { id, clave_inicial: CLAVE_INICIAL };
        });
    });
    route('GET', '/api/docentes/:id', ANY, async (c) => {
        misDatos(c.user, c.params.id);
        return await fichaData(Number(c.params.id));
    });
    route('PUT', '/api/docentes/:id', ADMIN, async (c) => {
        const id = Number(c.params.id);
        const d = docenteCampos(c.body);
        const estado = c.body.estado === 'inactivo' ? 'inactivo' : 'activo';
        if (!(await db.prepare('SELECT 1 FROM docentes WHERE id=?').get(id))) throw new HttpError(404, 'No encontramos a ese docente.');
        await transaction(async () => {
            await db.prepare(
                `UPDATE docentes SET nombres=?,apellidos=?,dni=?,email=?,telefono=?,direccion=?,fecha_nacimiento=?,sede=?,programa=?,categoria=?,grado_academico=?,especialidad=?,fecha_ingreso=?,observaciones=?,estado=? WHERE id=?`,
            ).run(
                d.nombres,
                d.apellidos,
                d.dni,
                d.email,
                d.telefono,
                d.direccion,
                d.fecha_nacimiento,
                d.sede,
                d.programa,
                d.categoria,
                d.grado_academico,
                d.especialidad,
                d.fecha_ingreso,
                d.observaciones,
                estado,
                id,
            );
            await db.prepare('UPDATE usuarios SET email=?, nombre=?, activo=? WHERE docente_id=?').run(
                d.email,
                `${d.nombres} ${d.apellidos}`,
                estado === 'activo' ? 1 : 0,
                id,
            );
        });
        await audit(c.user.email, 'DOCENTE_EDITADO', `${d.nombres} ${d.apellidos}`);
        return { ok: true };
    });
    // Es baja lógica: el docente pasa a inactivo para no perder su historial
    route('DELETE', '/api/docentes/:id', ADMIN, async (c) => {
        // baja lógica: el legajo nunca se pierde
        const id = Number(c.params.id);
        await db.prepare("UPDATE docentes SET estado='inactivo' WHERE id=?").run(id);
        await db.prepare('UPDATE usuarios SET activo=0 WHERE docente_id=?').run(id);
        await audit(c.user.email, 'DOCENTE_INACTIVADO', `id ${id}`);
        return { ok: true };
    });

    // ---- Evaluaciones, encuestas, supervisiones
    route('POST', '/api/docentes/:id/evaluaciones', STAFF, async (c) => {
        const id = Number(c.params.id);
        const b = c.body;
        const periodo = periodoOk(b.periodo);
        if (await db.prepare('SELECT 1 FROM evaluaciones WHERE docente_id=? AND periodo=?').get(id, periodo))
            throw new HttpError(409, `Ya existe una evaluación de ${periodo} para este docente. Elimínala primero si quieres corregirla.`);
        await db.prepare('INSERT INTO evaluaciones (docente_id,periodo,puntaje,evaluador,comentario) VALUES (?,?,?,?,?)').run(
            id,
            periodo,
            num(b, 'puntaje', 'El puntaje', 0, 20),
            c.user.nombre,
            str(b, 'comentario', 'Comentario', { req: false, max: 500 }),
        );
        await audit(c.user.email, 'EVALUACION_REGISTRADA', `docente ${id} · ${periodo}`);
        return { ok: true };
    });
    route('POST', '/api/docentes/:id/encuestas', ADMIN, async (c) => {
        const b = c.body;
        await db.prepare('INSERT INTO encuestas (docente_id,periodo,curso,respuestas,puntaje,comentario) VALUES (?,?,?,?,?,?)').run(
            Number(c.params.id),
            periodoOk(b.periodo),
            str(b, 'curso', 'El curso', { max: 120 }),
            num(b, 'respuestas', 'Las respuestas', 0, 500),
            num(b, 'puntaje', 'El puntaje', 0, 5),
            str(b, 'comentario', 'Comentario', { req: false, max: 500 }),
        );
        await audit(c.user.email, 'ENCUESTA_REGISTRADA', `docente ${c.params.id}`);
        return { ok: true };
    });
    route('POST', '/api/docentes/:id/supervisiones', STAFF, async (c) => {
        const b = c.body;
        await db.prepare(
            'INSERT INTO supervisiones (docente_id,fecha,curso,supervisor,puntaje,fortalezas,oportunidades,compromisos) VALUES (?,?,?,?,?,?,?,?)',
        ).run(
            Number(c.params.id),
            fecha(b, 'fecha', 'La fecha de la visita'),
            str(b, 'curso', 'El curso', { max: 120 }),
            c.user.nombre,
            num(b, 'puntaje', 'El puntaje', 0, 20),
            str(b, 'fortalezas', 'Fortalezas', { req: false, max: 600 }),
            str(b, 'oportunidades', 'Oportunidades de mejora', { req: false, max: 600 }),
            str(b, 'compromisos', 'Compromisos', { req: false, max: 600 }),
        );
        await audit(c.user.email, 'SUPERVISION_REGISTRADA', `docente ${c.params.id}`);
        return { ok: true };
    });
    for (const [tabla, ruta, evento] of [
        ['evaluaciones', 'evaluaciones', 'EVALUACION_ELIMINADA'],
        ['encuestas', 'encuestas', 'ENCUESTA_ELIMINADA'],
        ['supervisiones', 'supervisiones', 'SUPERVISION_ELIMINADA'],
    ]) {
        route('DELETE', `/api/${ruta}/:id`, ADMIN, async (c) => {
            await db.prepare(`DELETE FROM ${tabla} WHERE id=?`).run(Number(c.params.id));
            await audit(c.user.email, evento, `id ${c.params.id}`);
            return { ok: true };
        });
    }
};
