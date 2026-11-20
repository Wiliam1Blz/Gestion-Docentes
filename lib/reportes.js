'use strict';
// reportes.js: arma los PDF del sistema (constancia, ficha del docente y reporte de capacitación) usando pdf.js
const { Pdf } = require('./pdf');

// Colores institucionales usados en todos los PDF
const TEAL = '#123B7A',
    INK = '#1F2937',
    MUTED = '#64748B',
    SAND = '#F1F4F8',
    GOLD = '#A9772A',
    LINE = '#D5DBE3';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
// Convierte 2026-03-09 en '9 de marzo de 2026'
function fechaLarga(iso) {
    if (!iso) return '-';
    const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return `${d} de ${MESES[m - 1]} de ${y}`;
}
const ESTADOS = { inscrito: 'Inscrito', aprobado: 'Aprobado', desaprobado: 'Desaprobado', retirado: 'Retirado' };

// ------------------------------------------------------------------ Constancia
// Hoja horizontal con el diseño de la constancia, el código de verificación y el sello
function constanciaPdf(c, baseUrl) {
    const pdf = new Pdf(841.89, 595.28);
    const W = pdf.w,
        H = pdf.h;
    pdf.rect(0, 0, W, H, { fill: '#FFFFFF' });
    pdf.rect(22, 22, W - 44, H - 44, { stroke: TEAL, lineWidth: 3 });
    pdf.rect(32, 32, W - 64, H - 64, { stroke: GOLD, lineWidth: 0.8 });
    pdf.text('CERTUS', 0, 58, { size: 28, font: 'bold', color: TEAL, align: 'center', width: W });
    pdf.text('Escuela de Educación Superior  ·  Gestión Docente', 0, 92, { size: 11, color: MUTED, align: 'center', width: W });
    pdf.text('CONSTANCIA DE CAPACITACIÓN', 0, 128, { size: 30, font: 'bold', color: INK, align: 'center', width: W });
    pdf.line(W / 2 - 60, 172, W / 2 + 60, 172, { color: GOLD, lineWidth: 1.5 });
    pdf.text('Se otorga la presente a', 0, 190, { size: 13, font: 'italic', color: MUTED, align: 'center', width: W });
    pdf.text(c.docente, 0, 216, { size: 32, font: 'bold', color: TEAL, align: 'center', width: W });
    pdf.line(180, 260, W - 180, 260, { color: LINE });
    pdf.text('por haber aprobado satisfactoriamente la capacitación', 0, 274, { size: 13, color: INK, align: 'center', width: W });
    const titulo = pdf.truncate(`"${c.titulo}"`, W - 160, 20, true);
    pdf.text(titulo, 0, 300, { size: 20, font: 'bold', color: INK, align: 'center', width: W });
    const det = `realizada del ${fechaLarga(c.fecha_inicio)} al ${fechaLarga(c.fecha_fin)}, en modalidad ${c.modalidad.toLowerCase()}, con una duración de ${c.horas} horas académicas.`;
    let y = 338;
    for (const l of pdf.wrap(det, W - 220, 13)) {
        pdf.text(l, 0, y, { size: 13, color: INK, align: 'center', width: W });
        y += 20;
    }
    pdf.text(`Asistencia: ${Math.round(c.asistencia)}%   ·   Nota final: ${c.nota}`, 0, y + 6, { size: 12, color: MUTED, align: 'center', width: W });
    pdf.text(`Emitida el ${fechaLarga(c.constancia_fecha)}`, 0, y + 30, { size: 12, font: 'italic', color: MUTED, align: 'center', width: W });
    // firmas
    const fy = H - 120;
    pdf.line(110, fy, 300, fy, { color: INK });
    pdf.line(W - 300, fy, W - 110, fy, { color: INK });
    pdf.text('Gestión Docente', 110, fy + 6, { size: 11, font: 'bold', align: 'center', width: 190 });
    pdf.text('Coordinación Académica', W - 300, fy + 6, { size: 11, font: 'bold', align: 'center', width: 190 });
    // sello
    pdf.circle(W / 2, fy - 8, 34, { stroke: GOLD, lineWidth: 2 });
    pdf.circle(W / 2, fy - 8, 28, { stroke: GOLD, lineWidth: 0.6 });
    pdf.text('CERTUS', W / 2 - 34, fy - 18, { size: 9, font: 'bold', color: GOLD, align: 'center', width: 68 });
    pdf.text('OFICIAL', W / 2 - 34, fy - 6, { size: 7, color: GOLD, align: 'center', width: 68 });
    pdf.text(`Código de verificación: ${c.constancia_codigo}`, 0, H - 76, { size: 10, font: 'bold', color: INK, align: 'center', width: W });
    pdf.text(`Verifica su autenticidad en ${baseUrl}/verificar.html?c=${c.constancia_codigo}`, 0, H - 62, {
        size: 9,
        color: MUTED,
        align: 'center',
        width: W,
    });
    return pdf.toBuffer();
}

// ------------------------------------------------------------------ Helpers de tablas
// Prepara un documento A4 con encabezado y pie, y funciones para ir agregando secciones, datos y tablas.
// Si no entra más contenido, crea otra página sola.
function makeDoc(titulo, subtitulo) {
    const pdf = new Pdf();
    const M = 42;
    const W = pdf.w - M * 2;
    let pageNo = 1;
    const header = () => {
        pdf.rect(0, 0, pdf.w, 78, { fill: TEAL });
        pdf.text('CERTUS · Gestión Docente', M, 22, { size: 10, color: '#C9D5EA' });
        pdf.text(titulo, M, 38, { size: 20, font: 'bold', color: '#FFFFFF' });
        if (subtitulo) pdf.text(subtitulo, M, 62, { size: 10, color: '#DCE5F3' });
    };
    header();
    const doc = {
        pdf,
        M,
        W,
        y: 98,
        ensure(h) {
            if (doc.y + h > pdf.h - 54) {
                footer();
                pdf.newPage();
                pageNo++;
                header();
                doc.y = 98;
            }
        },
        section(t, need = 90) {
            doc.ensure(need);
            pdf.text(t, M, doc.y, { size: 13, font: 'bold', color: TEAL });
            doc.y += 20;
            pdf.line(M, doc.y - 4, M + W, doc.y - 4, { color: LINE });
            doc.y += 4;
        },
        kv(pairs, cols = 2) {
            const cw = W / cols;
            const rows = Math.ceil(pairs.length / cols);
            doc.ensure(rows * 32);
            pairs.forEach(([k, v], i) => {
                const cx = M + (i % cols) * cw,
                    cy = doc.y + Math.floor(i / cols) * 32;
                pdf.text(k.toUpperCase(), cx, cy, { size: 7.5, color: MUTED });
                pdf.text(pdf.truncate(v || '-', cw - 12, 10.5), cx, cy + 11, { size: 10.5, color: INK });
            });
            doc.y += rows * 32 + 4;
        },
        table(cols, rows, empty = 'Sin registros.') {
            // cols: [{h, w (fracción), align, key|fn}]
            if (!rows.length) {
                doc.ensure(24);
                pdf.text(empty, M, doc.y, { size: 10, font: 'italic', color: MUTED });
                doc.y += 26;
                return;
            }
            const drawHead = () => {
                pdf.rect(M, doc.y - 3, W, 18, { fill: SAND });
                let x = M + 6;
                cols.forEach((c) => {
                    pdf.text(c.h, x, doc.y + 1, { size: 8.5, font: 'bold', color: TEAL, align: c.align || 'left', width: c.w * W - 12 });
                    x += c.w * W;
                });
                doc.y += 20;
            };
            doc.ensure(50);
            drawHead();
            rows.forEach((r) => {
                if (doc.y + 18 > pdf.h - 54) {
                    doc.ensure(9999);
                    drawHead();
                }
                let x = M + 6;
                cols.forEach((c) => {
                    const v = c.fn ? c.fn(r) : r[c.key];
                    const cw = c.w * W - 12;
                    pdf.text(pdf.truncate(v ?? '-', cw, 9), x, doc.y, { size: 9, color: INK, align: c.align || 'left', width: cw });
                    x += c.w * W;
                });
                doc.y += 15;
                pdf.line(M, doc.y - 4, M + W, doc.y - 4, { color: '#E8ECF1', lineWidth: 0.5 });
            });
            doc.y += 8;
        },
    };
    const footer = () => {
        pdf.line(M, pdf.h - 40, M + W, pdf.h - 40, { color: LINE });
        pdf.text(`Generado el ${fechaLarga(new Date().toISOString())} · Documento de uso interno`, M, pdf.h - 32, { size: 8, color: MUTED });
        pdf.text(`Página ${pageNo}`, M, pdf.h - 32, { size: 8, color: MUTED, align: 'right', width: W });
    };
    doc.finish = () => {
        footer();
        return pdf.toBuffer();
    };
    return doc;
}

// ------------------------------------------------------------------ Ficha completa del docente
// Ficha completa del docente: datos, resumen, evaluaciones, encuestas, supervisiones y capacitaciones
function fichaPdf(f) {
    const d = f.docente;
    const doc = makeDoc('Ficha de información del docente', `${d.apellidos}, ${d.nombres}  ·  ${d.codigo}`);
    const { pdf } = doc;
    doc.section('Datos personales y laborales');
    doc.kv([
        ['Nombres y apellidos', `${d.nombres} ${d.apellidos}`],
        ['DNI', d.dni],
        ['Correo institucional', d.email],
        ['Teléfono', d.telefono],
        ['Fecha de nacimiento', fechaLarga(d.fecha_nacimiento)],
        ['Dirección', d.direccion],
        ['Sede', d.sede],
        ['Programa', d.programa],
        ['Categoría', d.categoria],
        ['Grado académico', d.grado_academico],
        ['Especialidad', d.especialidad],
        ['Fecha de ingreso', fechaLarga(d.fecha_ingreso)],
        ['Estado', d.estado === 'activo' ? 'Activo' : 'Inactivo'],
    ]);
    if (d.observaciones) {
        doc.ensure(34);
        pdf.text('OBSERVACIONES', doc.M, doc.y, { size: 7.5, color: MUTED });
        doc.y = pdf.paragraph(d.observaciones, doc.M, doc.y + 11, doc.W, { size: 10 }) + 6;
    }
    const r = f.resumen;
    doc.section('Resumen de desempeño');
    doc.kv([
        ['Evaluación más reciente', r.ultima_evaluacion != null ? `${r.ultima_evaluacion} / 20 (${r.ultimo_periodo})` : 'Sin evaluación'],
        ['Promedio histórico de evaluaciones', r.prom_evaluacion != null ? `${r.prom_evaluacion} / 20` : '-'],
        ['Promedio de encuestas', r.prom_encuesta != null ? `${r.prom_encuesta} / 5` : '-'],
        ['Promedio de supervisiones', r.prom_supervision != null ? `${r.prom_supervision} / 20` : '-'],
        ['Horas de capacitación aprobadas', `${r.horas_aprobadas} h`],
        ['Capacitaciones obligatorias', `${r.obligatorias_aprobadas} de ${r.obligatorias_total} aprobadas`],
    ]);
    doc.section('Evaluaciones por semestre');
    doc.table(
        [
            { h: 'Periodo', w: 0.14, key: 'periodo' },
            { h: 'Puntaje', w: 0.14, fn: (x) => `${x.puntaje} / 20` },
            { h: 'Evaluador', w: 0.26, key: 'evaluador' },
            { h: 'Comentario', w: 0.46, key: 'comentario' },
        ],
        f.evaluaciones,
    );
    doc.section('Resultados de encuestas estudiantiles');
    doc.table(
        [
            { h: 'Periodo', w: 0.14, key: 'periodo' },
            { h: 'Curso', w: 0.34, key: 'curso' },
            { h: 'Respuestas', w: 0.14, key: 'respuestas', align: 'right' },
            { h: 'Puntaje', w: 0.14, fn: (x) => `${x.puntaje} / 5`, align: 'right' },
            { h: 'Comentario', w: 0.24, key: 'comentario' },
        ],
        f.encuestas,
    );
    doc.section('Supervisión de clases y feedback', 150);
    if (!f.supervisiones.length) doc.table([], []);
    f.supervisiones.forEach((s) => {
        doc.ensure(100);
        pdf.rect(doc.M, doc.y - 2, doc.W, 18, { fill: SAND });
        pdf.text(`${fechaLarga(s.fecha)}  ·  ${s.curso}`, doc.M + 6, doc.y + 2, { size: 9.5, font: 'bold', color: INK });
        pdf.text(`${s.puntaje} / 20`, doc.M + 6, doc.y + 2, { size: 9.5, font: 'bold', color: TEAL, align: 'right', width: doc.W - 12 });
        doc.y += 24;
        [
            ['Fortalezas', s.fortalezas],
            ['Oportunidades de mejora', s.oportunidades],
            ['Compromisos', s.compromisos],
        ].forEach(([k, v]) => {
            if (!v) return;
            doc.ensure(30);
            pdf.text(k, doc.M + 6, doc.y, { size: 8.5, font: 'bold', color: MUTED });
            doc.y = pdf.paragraph(v, doc.M + 6, doc.y + 11, doc.W - 12, { size: 9.5 }) + 3;
        });
        doc.y += 4;
    });
    doc.section('Capacitaciones');
    doc.table(
        [
            { h: 'Capacitación', w: 0.42, key: 'titulo' },
            { h: 'Horas', w: 0.08, key: 'horas', align: 'right' },
            { h: 'Asist.', w: 0.1, fn: (x) => (x.asistencia != null ? Math.round(x.asistencia) + '%' : '-'), align: 'right' },
            { h: 'Nota', w: 0.08, fn: (x) => x.nota ?? '-', align: 'right' },
            { h: 'Estado', w: 0.16, fn: (x) => ESTADOS[x.estado] },
            { h: 'Constancia', w: 0.16, fn: (x) => (x.constancia_codigo ? 'Emitida' : '-') },
        ],
        f.capacitaciones,
    );
    return doc.finish();
}

// ------------------------------------------------------------------ Reporte de una capacitación
// Reporte de una capacitación con sus resultados y la lista de participantes
function capacitacionPdf(cap, inscritos, stats) {
    const doc = makeDoc('Reporte de capacitación', cap.titulo);
    doc.section('Datos generales');
    doc.kv([
        ['Modalidad', cap.modalidad],
        ['Duración', `${cap.horas} horas`],
        ['Fechas', `${fechaLarga(cap.fecha_inicio)} al ${fechaLarga(cap.fecha_fin)}`],
        ['Instructor', cap.instructor],
        ['Tipo', cap.obligatoria ? 'Obligatoria' : 'Optativa'],
        ['Estado', cap.estado.replace('_', ' ')],
    ]);
    doc.section('Resultados');
    doc.kv(
        [
            ['Inscritos', `${stats.total} de ${cap.cupo} cupos`],
            ['Aprobados', String(stats.aprobados)],
            ['Desaprobados', String(stats.desaprobados)],
            ['Asistencia promedio', stats.asistencia != null ? stats.asistencia + '%' : '-'],
            ['Nota promedio', stats.nota != null ? String(stats.nota) : '-'],
            ['Constancias emitidas', String(stats.constancias)],
        ],
        3,
    );
    doc.section('Participantes');
    doc.table(
        [
            { h: 'Docente', w: 0.3, key: 'docente' },
            { h: 'Sede', w: 0.16, key: 'sede' },
            { h: 'Asist.', w: 0.1, fn: (x) => (x.asistencia != null ? Math.round(x.asistencia) + '%' : '-'), align: 'right' },
            { h: 'Nota', w: 0.08, fn: (x) => x.nota ?? '-', align: 'right' },
            { h: 'Estado', w: 0.16, fn: (x) => ESTADOS[x.estado] },
            { h: 'Constancia', w: 0.2, fn: (x) => x.constancia_codigo || '-' },
        ],
        inscritos,
    );
    return doc.finish();
}
module.exports = { constanciaPdf, fichaPdf, capacitacionPdf, fechaLarga };
