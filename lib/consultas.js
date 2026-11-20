'use strict';
// consultas.js - cálculos y consultas de negocio que usan varias rutas (cumplimiento, resúmenes, constancias, estados).
module.exports = function consultas({ db, REGLAS, crypto, fecha, HttpError }) {
    // ------------------------------------------------------------------ Consultas de negocio
    // Redondea un promedio (si no hay dato devuelve null)
    const avg = (n, d = 1) => (n == null ? null : +Number(n).toFixed(d));
    // Regla de aprobación: asistencia y nota mínimas definidas en REGLAS
    const resultado = (asistencia, nota) => (asistencia >= REGLAS.asistenciaMin && nota >= REGLAS.notaMin ? 'aprobado' : 'desaprobado');

    // Calcula cuántas capacitaciones obligatorias lleva al día un docente
    async function cumplimiento(docenteId) {
        const obligs = await db
            .prepare("SELECT id,titulo,horas FROM capacitaciones WHERE obligatoria=1 AND estado IN ('finalizada','en_curso') ORDER BY fecha_inicio")
            .all();
        const docs = await db
            .prepare(
                `SELECT id,codigo,nombres,apellidos,sede,programa FROM docentes WHERE estado='activo' ${docenteId ? 'AND id=?' : ''} ORDER BY apellidos`,
            )
            .all(...(docenteId ? [docenteId] : []));
        const ins = await db.prepare('SELECT capacitacion_id,docente_id,estado FROM inscripciones').all();
        const horas = await db
            .prepare(
                "SELECT i.docente_id, SUM(c.horas) h FROM inscripciones i JOIN capacitaciones c ON c.id=i.capacitacion_id WHERE i.estado='aprobado' GROUP BY i.docente_id",
            )
            .all();
        const hMap = new Map(horas.map((r) => [r.docente_id, r.h]));
        const compl = new Map(
            (
                await db
                    .prepare(
                        "SELECT i.docente_id, COUNT(*) n, SUM(i.constancia_codigo IS NOT NULL) c FROM inscripciones i WHERE i.estado='aprobado' GROUP BY i.docente_id",
                    )
                    .all()
            ).map((r) => [r.docente_id, r]),
        );
        return docs.map((d) => {
            const detalle = obligs.map((o) => {
                const i = ins.find((x) => x.capacitacion_id === o.id && x.docente_id === d.id);
                return { capacitacion_id: o.id, titulo: o.titulo, estado: i ? i.estado : 'sin_inscripcion' };
            });
            const aprobadas = detalle.filter((x) => x.estado === 'aprobado').length;
            const faltan = detalle.filter((x) => x.estado !== 'aprobado');
            const estado = faltan.length === 0 ? 'al_dia' : faltan.every((x) => x.estado === 'inscrito') ? 'en_proceso' : 'pendiente';
            return {
                docente_id: d.id,
                codigo: d.codigo,
                docente: `${d.apellidos}, ${d.nombres}`,
                sede: d.sede,
                programa: d.programa,
                obligatorias_total: obligs.length,
                obligatorias_aprobadas: aprobadas,
                pct: obligs.length ? Math.round((aprobadas / obligs.length) * 100) : 100,
                estado,
                horas: hMap.get(d.id) || 0,
                completadas: compl.get(d.id)?.n || 0,
                constancias: compl.get(d.id)?.c || 0,
                por_emitir: (compl.get(d.id)?.n || 0) - (compl.get(d.id)?.c || 0),
                detalle,
                faltantes: faltan.map((x) => x.titulo),
            };
        });
    }

    // Resumen de un docente: últimas evaluaciones, horas, constancias, etc.
    async function resumenDocente(id) {
        const ev = await db.prepare('SELECT periodo, puntaje FROM evaluaciones WHERE docente_id=? ORDER BY periodo DESC').all(id);
        const en = (await db.prepare('SELECT AVG(puntaje) a FROM encuestas WHERE docente_id=?').get(id)).a;
        const su = (await db.prepare('SELECT AVG(puntaje) a FROM supervisiones WHERE docente_id=?').get(id)).a;
        const c = (await cumplimiento(id))[0];
        const horasSinCumpl = c
            ? null
            : (
                  await db
                      .prepare(
                          "SELECT COALESCE(SUM(c.horas),0) h FROM inscripciones i JOIN capacitaciones c ON c.id=i.capacitacion_id WHERE i.docente_id=? AND i.estado='aprobado'",
                      )
                      .get(id)
              ).h;
        return {
            ultima_evaluacion: ev[0]?.puntaje ?? null,
            ultimo_periodo: ev[0]?.periodo ?? null,
            prom_evaluacion: ev.length ? avg(ev.reduce((s, x) => s + x.puntaje, 0) / ev.length) : null,
            prom_encuesta: avg(en, 2),
            prom_supervision: avg(su),
            horas_aprobadas: c ? c.horas : horasSinCumpl,
            obligatorias_total: c?.obligatorias_total ?? 0,
            obligatorias_aprobadas: c?.obligatorias_aprobadas ?? 0,
            cumplimiento: c?.estado ?? null,
            faltantes: c?.faltantes ?? [],
        };
    }

    // Junta todos los datos del legajo (los usa la ficha en PDF y la pantalla)
    async function fichaData(id) {
        const docente = await db.prepare('SELECT * FROM docentes WHERE id=?').get(id);
        if (!docente) throw new HttpError(404, 'No encontramos a ese docente.');
        return {
            docente,
            evaluaciones: await db.prepare('SELECT * FROM evaluaciones WHERE docente_id=? ORDER BY periodo DESC').all(id),
            encuestas: await db.prepare('SELECT * FROM encuestas WHERE docente_id=? ORDER BY periodo DESC, curso').all(id),
            supervisiones: await db.prepare('SELECT * FROM supervisiones WHERE docente_id=? ORDER BY fecha DESC').all(id),
            capacitaciones: await db
                .prepare(
                    `SELECT i.id inscripcion_id, i.estado, i.asistencia, i.nota, i.constancia_codigo, i.constancia_fecha, c.id capacitacion_id, c.titulo, c.horas, c.fecha_inicio, c.fecha_fin, c.modalidad, c.obligatoria, c.estado cap_estado
          FROM inscripciones i JOIN capacitaciones c ON c.id=i.capacitacion_id WHERE i.docente_id=? ORDER BY c.fecha_inicio DESC`,
                )
                .all(id),
            resumen: await resumenDocente(id),
        };
    }

    // Estadísticas de una capacitación: inscritos, asistencia y nota promedio, aprobados
    async function statsCap(id) {
        const s = await db
            .prepare(
                `SELECT COUNT(*) total, SUM(estado='aprobado') aprobados, SUM(estado='desaprobado') desaprobados, SUM(estado='inscrito') en_proceso,
        AVG(asistencia) asistencia, AVG(nota) nota, SUM(constancia_codigo IS NOT NULL) constancias FROM inscripciones WHERE capacitacion_id=?`,
            )
            .get(id);
        return {
            total: s.total,
            aprobados: s.aprobados || 0,
            desaprobados: s.desaprobados || 0,
            en_proceso: s.en_proceso || 0,
            asistencia: s.asistencia == null ? null : Math.round(s.asistencia),
            nota: avg(s.nota),
            constancias: s.constancias || 0,
            por_emitir: (s.aprobados || 0) - (s.constancias || 0),
        };
    }
    // Lista de inscritos de una capacitación con sus datos
    const inscritosCap = (id) =>
        db
            .prepare(
                `SELECT i.id, i.docente_id, i.estado, i.asistencia, i.nota, i.constancia_codigo, i.constancia_fecha, CONCAT(d.apellidos, ', ', d.nombres) docente, d.sede, d.email, d.codigo
      FROM inscripciones i JOIN docentes d ON d.id=i.docente_id WHERE i.capacitacion_id=? ORDER BY d.apellidos`,
            )
            .all(id);

    // Código único de constancia: año, id de capacitación, id de inscripción y un sufijo aleatorio
    function nuevoCodigoConstancia(ins) {
        return `CERT-CAP-${new Date().getFullYear()}-${String(ins.capacitacion_id).padStart(3, '0')}-${String(ins.id).padStart(4, '0')}${crypto.randomBytes(1).toString('hex').toUpperCase()}`;
    }
    // Genera el código de constancia, pero solo si el docente aprobó (si ya tenía, lo devuelve igual)
    async function emitirConstancia(insId) {
        const ins = await db.prepare('SELECT * FROM inscripciones WHERE id=?').get(insId);
        if (!ins) throw new HttpError(404, 'No encontramos esa inscripción.');
        if (ins.estado !== 'aprobado') throw new HttpError(409, 'Solo se emite constancia a quienes aprobaron la capacitación.');
        if (ins.constancia_codigo) return ins.constancia_codigo;
        const codigo = nuevoCodigoConstancia(ins);
        await db.prepare('UPDATE inscripciones SET constancia_codigo=?, constancia_fecha=CURDATE() WHERE id=?').run(codigo, insId);
        return codigo;
    }

    // El estado de cada capacitación avanza solo según sus fechas (la cancelada se respeta).
    async function sincronizarEstados() {
        await db.exec("UPDATE capacitaciones SET estado='finalizada' WHERE estado IN ('programada','en_curso') AND fecha_fin < CURDATE()");
        await db.exec("UPDATE capacitaciones SET estado='en_curso' WHERE estado='programada' AND fecha_inicio <= CURDATE()");
    }
    return {
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
    };
};
