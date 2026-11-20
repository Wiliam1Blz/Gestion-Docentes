'use strict';
// rutas-capacitaciones.js - rutas de la API: capacitaciones, inscripciones, constancias, verificación y monitoreo. Salió de server.js para que no fuera tan largo.
module.exports = function rutasCapacitaciones({
    db,
    transaction,
    audit,
    REGLAS,
    R,
    buildZip,
    str,
    num,
    fecha,
    HttpError,
    bad,
    clean,
    cumplimiento,
    statsCap,
    emitirConstancia,
    resultado,
    inscritosCap,
    route,
    STAFF,
    ADMIN,
    ANY,
    PUBLIC_ROUTE,
    misDatos,
    file,
}) {
    // ---- Capacitaciones
    // Valida los campos de una capacitación
    function capCampos(b) {
        const inicio = fecha(b, 'fecha_inicio', 'La fecha de inicio');
        const fin = fecha(b, 'fecha_fin', 'La fecha de fin');
        if (fin < inicio) throw bad('La fecha de fin no puede ser anterior a la de inicio.');
        return {
            titulo: str(b, 'titulo', 'El título', { max: 150 }),
            descripcion: str(b, 'descripcion', 'La descripción', { req: false, max: 600 }),
            modalidad: ['Virtual', 'Presencial', 'Híbrida'].includes(b.modalidad) ? b.modalidad : 'Virtual',
            horas: num(b, 'horas', 'Las horas', 1, 200),
            inicio,
            fin,
            instructor: str(b, 'instructor', 'El instructor', { req: false, max: 100 }),
            cupo: num(b, 'cupo', 'El cupo', 1, 500),
            obligatoria: b.obligatoria ? 1 : 0,
            estado: ['programada', 'en_curso', 'finalizada', 'cancelada'].includes(b.estado) ? b.estado : 'programada',
        };
    }
    route('GET', '/api/capacitaciones', ANY, async (c) => {
        const base = await db.prepare('SELECT * FROM capacitaciones ORDER BY fecha_inicio DESC').all();
        const lista = await Promise.all(base.map(async (x) => ({ ...x, stats: await statsCap(x.id) })));
        if (c.user.rol === 'docente') {
            const mias = new Map(
                (await db.prepare('SELECT capacitacion_id, estado FROM inscripciones WHERE docente_id=?').all(c.user.docente_id)).map((r) => [
                    r.capacitacion_id,
                    r.estado,
                ]),
            );
            return lista.map((x) => ({ ...x, mi_estado: mias.get(x.id) || null }));
        }
        return lista;
    });
    route('POST', '/api/capacitaciones', ADMIN, async (c) => {
        const x = capCampos(c.body);
        const r = await db
            .prepare(
                'INSERT INTO capacitaciones (titulo,descripcion,modalidad,horas,fecha_inicio,fecha_fin,instructor,cupo,obligatoria,estado) VALUES (?,?,?,?,?,?,?,?,?,?)',
            )
            .run(x.titulo, x.descripcion, x.modalidad, x.horas, x.inicio, x.fin, x.instructor, x.cupo, x.obligatoria, x.estado);
        await audit(c.user.email, 'CAPACITACION_CREADA', x.titulo);
        return { id: Number(r.lastInsertRowid) };
    });
    route('GET', '/api/capacitaciones/:id', ANY, async (c) => {
        const cap = await db.prepare('SELECT * FROM capacitaciones WHERE id=?').get(Number(c.params.id));
        if (!cap) throw new HttpError(404, 'No encontramos esa capacitación.');
        let inscritos = await inscritosCap(cap.id);
        if (c.user.rol === 'docente') inscritos = inscritos.filter((i) => i.docente_id === c.user.docente_id).map(({ email, ...r }) => r);
        const disponibles =
            c.user.rol === 'admin'
                ? await db
                      .prepare(
                          "SELECT id, CONCAT(apellidos, ', ', nombres) nombre, sede FROM docentes WHERE estado='activo' AND id NOT IN (SELECT docente_id FROM inscripciones WHERE capacitacion_id=?) ORDER BY apellidos",
                      )
                      .all(cap.id)
                : [];
        return { ...cap, stats: await statsCap(cap.id), inscritos, disponibles, reglas: REGLAS };
    });
    route('PUT', '/api/capacitaciones/:id', ADMIN, async (c) => {
        const x = capCampos(c.body);
        await db.prepare(
            'UPDATE capacitaciones SET titulo=?,descripcion=?,modalidad=?,horas=?,fecha_inicio=?,fecha_fin=?,instructor=?,cupo=?,obligatoria=?,estado=? WHERE id=?',
        ).run(x.titulo, x.descripcion, x.modalidad, x.horas, x.inicio, x.fin, x.instructor, x.cupo, x.obligatoria, x.estado, Number(c.params.id));
        await audit(c.user.email, 'CAPACITACION_EDITADA', x.titulo);
        return { ok: true };
    });
    route('DELETE', '/api/capacitaciones/:id', ADMIN, async (c) => {
        const id = Number(c.params.id);
        if ((await db.prepare('SELECT COUNT(*) n FROM inscripciones WHERE capacitacion_id=?').get(id)).n)
            throw new HttpError(409, 'Ya tiene participantes inscritos. En lugar de borrarla, puedes marcarla como cancelada.');
        await db.prepare('DELETE FROM capacitaciones WHERE id=?').run(id);
        await audit(c.user.email, 'CAPACITACION_ELIMINADA', `id ${id}`);
        return { ok: true };
    });
    // No se puede inscribir en capacitaciones finalizadas o canceladas
    function puedeInscribir(cap) {
        if (!cap) throw new HttpError(404, 'No encontramos esa capacitación.');
        if (['finalizada', 'cancelada'].includes(cap.estado)) throw new HttpError(409, `No se puede inscribir: la capacitación está ${cap.estado}.`);
    }
    route('POST', '/api/capacitaciones/:id/inscripciones', ADMIN, async (c) => {
        const cap = await db.prepare('SELECT * FROM capacitaciones WHERE id=?').get(Number(c.params.id));
        puedeInscribir(cap);
        const ids = Array.isArray(c.body.docente_ids) ? c.body.docente_ids.map(Number).filter(Boolean) : [];
        if (!ids.length) throw bad('Elige al menos un docente.');
        let ok = 0;
        const omitidos = [];
        await transaction(async () => {
            for (const id of ids) {
                const lleno = (await db.prepare('SELECT COUNT(*) n FROM inscripciones WHERE capacitacion_id=?').get(cap.id)).n >= cap.cupo;
                if (lleno) {
                    omitidos.push('Cupo completo');
                    continue;
                }
                const r = await db
                    .prepare(
                        "INSERT IGNORE INTO inscripciones (capacitacion_id, docente_id) SELECT ?, id FROM docentes WHERE id=? AND estado='activo'",
                    )
                    .run(cap.id, id);
                if (r.changes) ok++;
            }
        });
        await audit(c.user.email, 'INSCRIPCIONES', `${cap.titulo}: ${ok} docente(s)`);
        return { inscritos: ok, omitidos: omitidos.length };
    });
    // El docente se inscribe solo (solo para el rol docente)
    route('POST', '/api/capacitaciones/:id/inscribirme', ['docente'], async (c) => {
        const cap = await db.prepare('SELECT * FROM capacitaciones WHERE id=?').get(Number(c.params.id));
        puedeInscribir(cap);
        if ((await db.prepare('SELECT COUNT(*) n FROM inscripciones WHERE capacitacion_id=?').get(cap.id)).n >= cap.cupo)
            throw new HttpError(409, 'Lo sentimos, ya no quedan cupos.');
        const r = await db.prepare('INSERT IGNORE INTO inscripciones (capacitacion_id, docente_id) VALUES (?,?)').run(cap.id, c.user.docente_id);
        if (!r.changes) throw new HttpError(409, 'Ya estás inscrito en esta capacitación.');
        await audit(c.user.email, 'AUTOINSCRIPCION', cap.titulo);
        return { ok: true };
    });
    // Aquí se registra asistencia y nota; el resultado (aprobado/desaprobado) lo calcula el sistema
    route('PUT', '/api/inscripciones/:id', ADMIN, async (c) => {
        const ins = await db.prepare('SELECT * FROM inscripciones WHERE id=?').get(Number(c.params.id));
        if (!ins) throw new HttpError(404, 'No encontramos esa inscripción.');
        const asistencia = num(c.body, 'asistencia', 'La asistencia', 0, 100, { req: false });
        const nota = num(c.body, 'nota', 'La nota', 0, 20, { req: false });
        let estado = c.body.estado === 'retirado' ? 'retirado' : 'inscrito';
        if (estado !== 'retirado' && asistencia != null && nota != null) estado = resultado(asistencia, nota);
        let anulada = false;
        if (estado !== 'aprobado' && ins.constancia_codigo) anulada = true;
        await db.prepare('UPDATE inscripciones SET asistencia=?, nota=?, estado=?, constancia_codigo=?, constancia_fecha=? WHERE id=?').run(
            asistencia,
            nota,
            estado,
            anulada ? null : ins.constancia_codigo,
            anulada ? null : ins.constancia_fecha,
            ins.id,
        );
        await audit(c.user.email, 'RESULTADO_REGISTRADO', `inscripción ${ins.id} → ${estado}${anulada ? ' (constancia anulada)' : ''}`);
        return { estado, constancia_anulada: anulada };
    });
    route('DELETE', '/api/inscripciones/:id', ADMIN, async (c) => {
        const ins = await db.prepare('SELECT * FROM inscripciones WHERE id=?').get(Number(c.params.id));
        if (ins?.constancia_codigo) throw new HttpError(409, 'Ya tiene una constancia emitida; no se puede quitar de la capacitación.');
        await db.prepare('DELETE FROM inscripciones WHERE id=?').run(Number(c.params.id));
        await audit(c.user.email, 'INSCRIPCION_QUITADA', `id ${c.params.id}`);
        return { ok: true };
    });

    // ---- Constancias
    route('POST', '/api/inscripciones/:id/constancia', ADMIN, async (c) => {
        const codigo = await emitirConstancia(Number(c.params.id));
        await audit(c.user.email, 'CONSTANCIA_EMITIDA', codigo);
        return { codigo };
    });
    route('POST', '/api/capacitaciones/:id/constancias', ADMIN, async (c) => {
        const pend = await db
            .prepare("SELECT id FROM inscripciones WHERE capacitacion_id=? AND estado='aprobado' AND constancia_codigo IS NULL")
            .all(Number(c.params.id));
        await transaction(async () => {
            for (const p of pend) await emitirConstancia(p.id);
        });
        await audit(c.user.email, 'CONSTANCIAS_MASIVAS', `capacitación ${c.params.id}: ${pend.length}`);
        return { emitidas: pend.length };
    });
    // Descarga de constancia en PDF; un docente solo puede bajar las suyas
    route('GET', '/api/inscripciones/:id/constancia.pdf', ANY, async (c) => {
        const row = await db
            .prepare(
                `SELECT i.*, c.titulo, c.horas, c.fecha_inicio, c.fecha_fin, c.modalidad, CONCAT(d.nombres, ' ', d.apellidos) docente FROM inscripciones i
        JOIN capacitaciones c ON c.id=i.capacitacion_id JOIN docentes d ON d.id=i.docente_id WHERE i.id=?`,
            )
            .get(Number(c.params.id));
        if (!row) throw new HttpError(404, 'No encontramos esa constancia.');
        misDatos(c.user, row.docente_id);
        if (!row.constancia_codigo) throw new HttpError(409, 'Esta constancia todavía no ha sido emitida.');
        await audit(c.user.email, 'CONSTANCIA_DESCARGADA', row.constancia_codigo);
        return file(R.constanciaPdf(row, c.base), 'application/pdf', `Constancia-${row.constancia_codigo}.pdf`);
    });
    route('POST', '/api/constancias/emitir-pendientes', ADMIN, async (c) => {
        const pend = await db.prepare("SELECT id FROM inscripciones WHERE estado='aprobado' AND constancia_codigo IS NULL").all();
        await transaction(async () => {
            for (const p of pend) await emitirConstancia(p.id);
        });
        await audit(c.user.email, 'CONSTANCIAS_MASIVAS', `todas las capacitaciones: ${pend.length}`);
        return { emitidas: pend.length };
    });
    // Todas las constancias de un docente en un solo ZIP
    route('GET', '/api/docentes/:id/constancias.zip', ANY, async (c) => {
        const id = Number(c.params.id);
        misDatos(c.user, id);
        const d = await db.prepare('SELECT nombres, apellidos, codigo FROM docentes WHERE id=?').get(id);
        if (!d) throw new HttpError(404, 'No encontramos a ese docente.');
        const rows = await db
            .prepare(
                `SELECT i.*, c.titulo, c.horas, c.fecha_inicio, c.fecha_fin, c.modalidad, CONCAT(d.nombres, ' ', d.apellidos) docente FROM inscripciones i
        JOIN capacitaciones c ON c.id=i.capacitacion_id JOIN docentes d ON d.id=i.docente_id WHERE i.docente_id=? AND i.constancia_codigo IS NOT NULL ORDER BY c.fecha_inicio`,
            )
            .all(id);
        if (!rows.length) throw new HttpError(409, 'Todavía no hay constancias emitidas para descargar.');
        const limpio = (t) =>
            t
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^A-Za-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 60);
        const buf = buildZip(rows.map((r) => ({ name: `${limpio(r.titulo)}_${r.constancia_codigo}.pdf`, data: R.constanciaPdf(r, c.base) })));
        await audit(c.user.email, 'CONSTANCIAS_ZIP', `${d.codigo}: ${rows.length}`);
        return file(buf, 'application/zip', `Constancias-${d.codigo}.zip`);
    });
    // Verificación pública: cualquiera puede comprobar si un código de constancia es auténtico
    route('GET', '/api/verificar/:codigo', PUBLIC_ROUTE, async (c) => {
        const r = await db
            .prepare(
                `SELECT i.constancia_codigo, i.constancia_fecha, c.titulo, c.horas, c.fecha_inicio, c.fecha_fin, CONCAT(d.nombres, ' ', d.apellidos) docente FROM inscripciones i
        JOIN capacitaciones c ON c.id=i.capacitacion_id JOIN docentes d ON d.id=i.docente_id WHERE i.constancia_codigo=? AND i.estado='aprobado'`,
            )
            .get(clean(c.params.codigo).toUpperCase());
        if (!r) throw new HttpError(404, 'No encontramos una constancia con ese código. Revisa que esté bien escrito.');
        return { valida: true, ...r };
    });

    // ---- Monitoreo
    route('GET', '/api/monitoreo', STAFF, async (c) => {
        let filas = await cumplimiento();
        const { sede = '', estado = '' } = c.query;
        if (sede) filas = filas.filter((f) => f.sede === sede);
        if (estado) filas = filas.filter((f) => f.estado === estado);
        const capsBase = await db.prepare("SELECT * FROM capacitaciones WHERE estado IN ('en_curso','finalizada') ORDER BY fecha_inicio DESC").all();
        const caps = await Promise.all(
            capsBase.map(async (x) => ({ id: x.id, titulo: x.titulo, estado: x.estado, obligatoria: x.obligatoria, horas: x.horas, stats: await statsCap(x.id) })),
        );
        const resumen = {
            completadas: filas.reduce((a, f) => a + f.completadas, 0),
            constancias: filas.reduce((a, f) => a + f.constancias, 0),
            por_emitir: filas.reduce((a, f) => a + f.por_emitir, 0),
            docentes: filas.length,
        };
        return { filas, capacitaciones: caps, resumen };
    });
};
