'use strict';
// rutas-panel.js - rutas de la API: panel de inicio (dashboard). Salió de server.js para que no fuera tan largo.
module.exports = function rutasPanel({ db, cumplimiento, fichaData, avg, route, ANY }) {
    // ---- Panel de inicio
    // Datos del panel de inicio (cambia según el rol de quien entra)
    route('GET', '/api/dashboard', ANY, async (c) => {
        if (c.user.rol === 'docente') {
            const f = await fichaData(c.user.docente_id);
            return {
                tipo: 'docente',
                docente: f.docente,
                resumen: f.resumen,
                proximas: f.capacitaciones.filter((x) => x.cap_estado !== 'finalizada' && x.cap_estado !== 'cancelada'),
                constancias: f.capacitaciones.filter((x) => x.constancia_codigo),
            };
        }
        const periodo = (await db.prepare('SELECT MAX(periodo) p FROM evaluaciones').get()).p;
        const cump = await cumplimiento();
        const activos = (await db.prepare("SELECT COUNT(*) n FROM docentes WHERE estado='activo'").get()).n;
        const porEmitir = (await db.prepare("SELECT COUNT(*) n FROM inscripciones WHERE estado='aprobado' AND constancia_codigo IS NULL").get()).n;
        const sinEval = await db
            .prepare(
                "SELECT d.id, CONCAT(d.apellidos, ', ', d.nombres) nombre FROM docentes d WHERE d.estado='activo' AND NOT EXISTS (SELECT 1 FROM evaluaciones e WHERE e.docente_id=d.id AND e.periodo=?)",
            )
            .all(periodo);
        const bajos = await db
            .prepare(
                "SELECT d.id, CONCAT(d.apellidos, ', ', d.nombres) nombre, e.puntaje FROM evaluaciones e JOIN docentes d ON d.id=e.docente_id WHERE e.periodo=? AND e.puntaje<14 AND d.estado='activo' ORDER BY e.puntaje",
            )
            .all(periodo);
        const pendientes = cump.filter((x) => x.estado === 'pendiente');
        const alertas = [];
        if (pendientes.length)
            alertas.push({
                nivel: 'alto',
                texto: `${pendientes.length} docente${pendientes.length > 1 ? 's' : ''} con capacitaciones obligatorias pendientes.`,
                link: '#/monitoreo',
            });
        if (porEmitir)
            alertas.push({
                nivel: 'medio',
                texto: `${porEmitir} constancia${porEmitir > 1 ? 's' : ''} por emitir a docentes que ya aprobaron.`,
                link: '#/capacitaciones',
                accion: 'emitir-pendientes',
            });
        if (bajos.length)
            alertas.push({
                nivel: 'medio',
                texto: `${bajos.length} docente${bajos.length > 1 ? 's' : ''} con evaluación menor a 14 en ${periodo}: conviene acompañarlos.`,
                link: `#/docentes/${bajos[0].id}`,
            });
        if (sinEval.length)
            alertas.push({
                nivel: 'bajo',
                texto: `${sinEval.length} docente${sinEval.length > 1 ? 's' : ''} aún sin evaluación de ${periodo}.`,
                link: `#/docentes/${sinEval[0].id}`,
            });
        const promEval = (await db.prepare('SELECT AVG(puntaje) a FROM evaluaciones WHERE periodo=?').get(periodo)).a;
        const promEnc = (await db.prepare('SELECT AVG(puntaje) a FROM encuestas WHERE periodo=(SELECT MAX(periodo) FROM encuestas)').get()).a;
        const horasTotales = (
            await db
                .prepare(
                    "SELECT COALESCE(SUM(c.horas),0) h FROM inscripciones i JOIN capacitaciones c ON c.id=i.capacitacion_id WHERE i.estado='aprobado'",
                )
                .get()
        ).h;
        const enCurso = (await db.prepare("SELECT COUNT(*) n FROM capacitaciones WHERE estado='en_curso'").get()).n;
        const evolucion = await db
            .prepare(
                'SELECT e.periodo, AVG(e.puntaje) prom_eval, (SELECT AVG(n.puntaje) FROM encuestas n WHERE n.periodo=e.periodo) prom_enc FROM evaluaciones e WHERE e.periodo LIKE ? GROUP BY e.periodo ORDER BY e.periodo',
            )
            .all(`${new Date().getFullYear()}-%`);
        const porSede = await db
            .prepare(
                "SELECT d.sede, COUNT(DISTINCT d.id) docentes, AVG(e.puntaje) prom FROM docentes d LEFT JOIN evaluaciones e ON e.docente_id=d.id AND e.periodo=? WHERE d.estado='activo' GROUP BY d.sede ORDER BY d.sede",
            )
            .all(periodo);
        const capsPanel = await db
            .prepare(
                "SELECT id,titulo,estado,fecha_inicio,fecha_fin,cupo,obligatoria,(SELECT COUNT(*) FROM inscripciones i WHERE i.capacitacion_id=capacitaciones.id) inscritos FROM capacitaciones WHERE estado IN ('en_curso','programada') ORDER BY fecha_inicio",
            )
            .all();
        return {
            tipo: 'staff',
            periodo,
            kpis: {
                docentes_activos: activos,
                prom_evaluacion: avg(promEval),
                prom_encuesta: avg(promEnc, 2),
                horas_totales: horasTotales,
                cumplimiento: cump.length ? Math.round((cump.filter((x) => x.estado === 'al_dia').length / cump.length) * 100) : 100,
                caps_en_curso: enCurso,
            },
            evolucion: evolucion.map((r) => ({ periodo: r.periodo, prom_eval: avg(r.prom_eval), prom_enc: avg(r.prom_enc, 2) })),
            por_sede: porSede.map((r) => ({ sede: r.sede, docentes: r.docentes, prom: avg(r.prom) })),
            cumplimiento: {
                al_dia: cump.filter((x) => x.estado === 'al_dia').length,
                en_proceso: cump.filter((x) => x.estado === 'en_proceso').length,
                pendiente: pendientes.length,
            },
            alertas,
            capacitaciones: capsPanel,
        };
    });
};
