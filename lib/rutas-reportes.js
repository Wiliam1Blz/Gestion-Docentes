'use strict';
// rutas-reportes.js - rutas de descarga de reportes (Excel, CSV y PDF).
// Salieron de server.js para que ese archivo no fuera tan largo. Recibe lo que necesita desde server.js.
module.exports = function rutasReportes({
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
}) {
    // ---- Reportes
    // Fecha de hoy para poner en el nombre de los archivos
    const stamp = () => new Date().toISOString().slice(0, 10);
    // Filtro opcional por sede en los reportes
    const sedeFiltro = (c) => (c.query.sede ? ' AND d.sede=?' : '');
    route('GET', '/api/reportes/docentes.xlsx', STAFF, async (c) => {
        const args = c.query.sede ? [c.query.sede] : [];
        const docs = await db.prepare(`SELECT d.* FROM docentes d WHERE 1=1${sedeFiltro(c)} ORDER BY d.apellidos`).all(...args);
        const resumenes = await Promise.all(docs.map((d) => resumenDocente(d.id)));
        const filas = docs.map((d, i) => {
            const r = resumenes[i];
            return [
                d.codigo,
                d.apellidos,
                d.nombres,
                d.dni,
                d.email,
                d.sede,
                d.programa,
                d.categoria,
                d.grado_academico,
                d.estado,
                r.ultimo_periodo,
                r.ultima_evaluacion,
                r.prom_evaluacion,
                r.prom_encuesta,
                r.prom_supervision,
                r.horas_aprobadas,
                `${r.obligatorias_aprobadas}/${r.obligatorias_total}`,
            ];
        });
        const por = async (t, extra) =>
            (
                await db
                    .prepare(
                        `SELECT d.codigo, CONCAT(d.apellidos, ', ', d.nombres) docente, ${extra} FROM ${t} x JOIN docentes d ON d.id=x.docente_id WHERE 1=1${sedeFiltro(c)} ORDER BY d.apellidos`,
                    )
                    .all(...args)
            ).map((r) => Object.values(r));
        const hojaEval = await por('evaluaciones', 'x.periodo, x.puntaje, x.comentario');
        const hojaEnc = await por('encuestas', 'x.periodo, x.curso, x.respuestas, x.puntaje');
        const hojaSup = await por('supervisiones', 'x.fecha, x.curso, x.puntaje, x.fortalezas, x.oportunidades, x.compromisos');
        const buf = buildXlsx([
            {
                name: 'Docentes',
                rows: [
                    [
                        'Código',
                        'Apellidos',
                        'Nombres',
                        'DNI',
                        'Correo',
                        'Sede',
                        'Programa',
                        'Categoría',
                        'Grado',
                        'Estado',
                        'Último periodo',
                        'Última evaluación',
                        'Prom. evaluaciones',
                        'Prom. encuestas',
                        'Prom. supervisiones',
                        'Horas capacitación',
                        'Obligatorias',
                    ],
                    ...filas,
                ],
            },
            {
                name: 'Evaluaciones',
                rows: [['Código', 'Docente', 'Periodo', 'Puntaje', 'Comentario'], ...hojaEval],
            },
            {
                name: 'Encuestas',
                rows: [
                    ['Código', 'Docente', 'Periodo', 'Curso', 'Respuestas', 'Puntaje'],
                    ...hojaEnc,
                ],
            },
            {
                name: 'Supervisiones',
                rows: [
                    ['Código', 'Docente', 'Fecha', 'Curso', 'Puntaje', 'Fortalezas', 'Oportunidades', 'Compromisos'],
                    ...hojaSup,
                ],
            },
        ]);
        await audit(c.user.email, 'REPORTE_DESCARGADO', 'docentes.xlsx');
        return file(buf, XLSX, `Reporte-docentes-${stamp()}.xlsx`);
    });
    route('GET', '/api/reportes/docentes.csv', STAFF, async (c) => {
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const docs = await db
            .prepare(`SELECT d.* FROM docentes d WHERE 1=1${sedeFiltro(c)} ORDER BY d.apellidos`)
            .all(...(c.query.sede ? [c.query.sede] : []));
        const lines = [
            ['Código', 'Apellidos', 'Nombres', 'DNI', 'Correo', 'Sede', 'Programa', 'Estado', 'Última evaluación', 'Horas de capacitación']
                .map(q)
                .join(','),
        ];
        for (const d of docs) {
            const r = await resumenDocente(d.id);
            lines.push(
                [d.codigo, d.apellidos, d.nombres, d.dni, d.email, d.sede, d.programa, d.estado, r.ultima_evaluacion, r.horas_aprobadas]
                    .map(q)
                    .join(','),
            );
        }
        await audit(c.user.email, 'REPORTE_DESCARGADO', 'docentes.csv');
        return file(Buffer.from('﻿' + lines.join('\r\n'), 'utf8'), 'text/csv; charset=utf-8', `Reporte-docentes-${stamp()}.csv`);
    });
    route('GET', '/api/reportes/capacitaciones.xlsx', STAFF, async (c) => {
        const caps = await db.prepare('SELECT * FROM capacitaciones ORDER BY fecha_inicio').all();
        const stats = await Promise.all(caps.map((x) => statsCap(x.id)));
        const resumen = caps.map((x, i) => {
            const s = stats[i];
            return [
                x.titulo,
                x.obligatoria ? 'Obligatoria' : 'Optativa',
                x.modalidad,
                x.horas,
                x.fecha_inicio,
                x.fecha_fin,
                x.estado,
                x.cupo,
                s.total,
                s.aprobados,
                s.desaprobados,
                s.en_proceso,
                s.asistencia,
                s.nota,
                s.constancias,
            ];
        });
        const part = (
            await db
                .prepare(
                    `SELECT c.titulo, d.codigo, CONCAT(d.apellidos, ', ', d.nombres) docente, d.sede, i.estado, i.asistencia, i.nota, i.constancia_codigo, i.constancia_fecha FROM inscripciones i JOIN capacitaciones c ON c.id=i.capacitacion_id JOIN docentes d ON d.id=i.docente_id ORDER BY c.fecha_inicio, d.apellidos`,
                )
                .all()
        ).map((r) => Object.values(r));
        await audit(c.user.email, 'REPORTE_DESCARGADO', 'capacitaciones.xlsx');
        return file(
            buildXlsx([
                {
                    name: 'Capacitaciones',
                    rows: [
                        [
                            'Capacitación',
                            'Tipo',
                            'Modalidad',
                            'Horas',
                            'Inicio',
                            'Fin',
                            'Estado',
                            'Cupo',
                            'Inscritos',
                            'Aprobados',
                            'Desaprobados',
                            'En proceso',
                            'Asistencia prom. %',
                            'Nota prom.',
                            'Constancias',
                        ],
                        ...resumen,
                    ],
                },
                {
                    name: 'Participantes',
                    rows: [
                        ['Capacitación', 'Código', 'Docente', 'Sede', 'Estado', 'Asistencia %', 'Nota', 'Código constancia', 'Fecha constancia'],
                        ...part,
                    ],
                },
            ]),
            XLSX,
            `Reporte-capacitaciones-${stamp()}.xlsx`,
        );
    });
    route('GET', '/api/reportes/cumplimiento.xlsx', STAFF, async (c) => {
        const filas = await cumplimiento();
        await audit(c.user.email, 'REPORTE_DESCARGADO', 'cumplimiento.xlsx');
        return file(
            buildXlsx([
                {
                    name: 'Cumplimiento',
                    rows: [
                        [
                            'Código',
                            'Docente',
                            'Sede',
                            'Programa',
                            'Obligatorias aprobadas',
                            'Obligatorias totales',
                            '% cumplimiento',
                            'Situación',
                            'Capacitaciones completadas',
                            'Horas aprobadas',
                            'Constancias emitidas',
                            'Constancias por emitir',
                            'Pendientes',
                        ],
                        ...filas.map((f) => [
                            f.codigo,
                            f.docente,
                            f.sede,
                            f.programa,
                            f.obligatorias_aprobadas,
                            f.obligatorias_total,
                            f.pct,
                            { al_dia: 'Al día', en_proceso: 'En proceso', pendiente: 'Pendiente' }[f.estado],
                            f.completadas,
                            f.horas,
                            f.constancias,
                            f.por_emitir,
                            f.faltantes.join(' | '),
                        ]),
                    ],
                },
            ]),
            XLSX,
            `Reporte-cumplimiento-${stamp()}.xlsx`,
        );
    });
    route('GET', '/api/docentes/:id/ficha.pdf', ANY, async (c) => {
        misDatos(c.user, c.params.id);
        const f = await fichaData(Number(c.params.id));
        await audit(c.user.email, 'FICHA_DESCARGADA', f.docente.codigo);
        return file(R.fichaPdf(f), 'application/pdf', `Ficha-${f.docente.codigo}-${f.docente.apellidos.split(' ')[0]}.pdf`);
    });
    route('GET', '/api/capacitaciones/:id/reporte.pdf', STAFF, async (c) => {
        const cap = await db.prepare('SELECT * FROM capacitaciones WHERE id=?').get(Number(c.params.id));
        if (!cap) throw new HttpError(404, 'No encontramos esa capacitación.');
        return file(R.capacitacionPdf(cap, await inscritosCap(cap.id), await statsCap(cap.id)), 'application/pdf', `Reporte-capacitacion-${cap.id}.pdf`);
    });
    // Tipo MIME de los archivos Excel
    const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
};
