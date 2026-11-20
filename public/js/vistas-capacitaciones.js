// vistas-capacitaciones.js - parte del frontend de Gestión Docente CERTUS: vistas de capacitaciones, monitoreo, reportes y actividad.
// Los archivos se cargan en orden desde index.html (base, sesion, vistas..., acciones) y comparten las mismas funciones.
'use strict';
/* ============================================================ Capacitaciones */
// lista de capacitaciones con chips de filtro
let capFiltro = 'todas';
async function vCapacitaciones() {
    const lista = await api('/api/capacitaciones');
    const f = capFiltro === 'todas' ? lista : lista.filter((x) => x.estado === capFiltro);
    const chips = [
        ['todas', 'Todas'],
        ['en_curso', 'En curso'],
        ['programada', 'Programadas'],
        ['finalizada', 'Finalizadas'],
        ['cancelada', 'Canceladas'],
    ];
    view(`<div class="page-head"><div><h1>Capacitaciones</h1><p>${isStaff() ? 'Programa, inscribe, registra resultados y emite constancias.' : 'Crece profesionalmente: inscríbete y descarga tus constancias.'}</p></div>
<div class="actions">${isAdmin() ? `<button class="btn primary" data-act="nueva-cap">${ico('plus')} Nueva capacitación</button>` : ''}${isStaff() ? dlBtn('/api/reportes/capacitaciones.xlsx', 'Exportar Excel') : ''}</div></div>
<div class="chips" role="group" aria-label="Filtrar por estado">${chips.map(([k, l]) => `<button class="chip" data-act="cap-filtro" data-k="${k}" aria-pressed="${k === capFiltro}">${l}</button>`).join('')}</div>
${
    f.length
        ? `<div class="grid g2">${f
              .map((x) => {
                  const s = x.stats;
                  const pctIns = Math.round((s.total / x.cupo) * 100);
                  return `<a class="card cap-card" href="#/capacitaciones/${x.id}"><div style="display:flex;gap:6px;flex-wrap:wrap">${bCap(x.estado)}${x.obligatoria ? badge('Obligatoria', 'b-warn') : badge('Optativa', 'b-mute')}${badge(x.modalidad, 'b-mute')}${x.mi_estado ? bInsc(x.mi_estado) : ''}</div>
  <h3>${esc(x.titulo)}</h3><p class="muted small" style="margin:0">${fmtDate(x.fecha_inicio)} – ${fmtDate(x.fecha_fin)} · ${x.horas} h · ${esc(x.instructor || 'Por definir')}</p>
  <div><div style="display:flex;justify-content:space-between" class="small"><span>${s.total} de ${x.cupo} cupos</span>${s.total ? `<span class="muted">${s.aprobados} aprobados</span>` : ''}</div>${bar(pctIns)}</div></a>`;
              })
              .join('')}</div>`
        : `<div class="card">${empty('No hay capacitaciones en esta categoría', 'Prueba con otro filtro.')}</div>`
}`);
}
// campos del formulario de capacitación
const capFields = () => [
    { name: 'titulo', label: 'Título', required: true, full: true },
    { name: 'descripcion', label: 'Descripción', type: 'textarea', full: true },
    { name: 'modalidad', label: 'Modalidad', type: 'select', options: ['Virtual', 'Presencial', 'Híbrida'] },
    { name: 'horas', label: 'Horas académicas', type: 'number', min: 1, max: 200, required: true, default: 6 },
    { name: 'fecha_inicio', label: 'Inicio', type: 'date', required: true },
    { name: 'fecha_fin', label: 'Fin', type: 'date', required: true },
    { name: 'instructor', label: 'Instructor/a' },
    { name: 'cupo', label: 'Cupo máximo', type: 'number', min: 1, max: 500, required: true, default: 20 },
    {
        name: 'estado',
        label: 'Estado',
        type: 'select',
        options: [
            ['programada', 'Programada'],
            ['en_curso', 'En curso'],
            ['finalizada', 'Finalizada'],
            ['cancelada', 'Cancelada'],
        ],
    },
    { name: 'obligatoria', label: 'Es obligatoria', type: 'checkbox', help: 'Cuenta para el cumplimiento de cada docente.' },
];
// detalle de una capacitación: asistencia, notas y constancias
async function vCapacitacion(id) {
    const c = await api('/api/capacitaciones/' + id);
    const s = c.stats;
    CTX.cap = c;
    const admin = isAdmin();
    const mine = !isStaff() ? c.inscritos[0] : null;
    const canSelf = !isStaff() && !mine && ['programada', 'en_curso'].includes(c.estado);
    view(`<p style="margin:0 0 10px"><a href="#/capacitaciones">← Volver a capacitaciones</a></p>
<div class="page-head"><div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">${bCap(c.estado)}${c.obligatoria ? badge('Obligatoria', 'b-warn') : badge('Optativa', 'b-mute')}${badge(c.modalidad, 'b-mute')}</div><h1>${esc(c.titulo)}</h1>
  <p>${fmtDate(c.fecha_inicio)} – ${fmtDate(c.fecha_fin)} · ${c.horas} horas · ${esc(c.instructor || 'Instructor por definir')}</p></div>
  <div class="actions">${canSelf ? `<button class="btn primary" data-act="inscribirme" data-id="${id}">Quiero inscribirme</button>` : ''}${admin ? `<button class="btn" data-act="edit-cap">Editar</button>${['programada', 'en_curso'].includes(c.estado) ? `<button class="btn primary" data-act="inscribir">${ico('plus')} Inscribir docentes</button>` : ''}` : ''}
  ${isStaff() ? dlBtn(`/api/capacitaciones/${id}/reporte.pdf`, 'Reporte PDF') : ''}</div></div>
${c.descripcion ? `<p style="max-width:75ch">${esc(c.descripcion)}</p>` : ''}
${
    isStaff()
        ? `<div class="grid g6" style="margin:18px 0"><div class="card stat"><div class="v">${s.total}<small> / ${c.cupo}</small></div><div class="l">Inscritos</div></div><div class="card stat"><div class="v">${s.aprobados}</div><div class="l">Aprobados</div></div>
  <div class="card stat"><div class="v">${s.asistencia != null ? s.asistencia + '%' : '—'}</div><div class="l">Asistencia promedio</div></div><div class="card stat"><div class="v">${s.nota ?? '—'}</div><div class="l">Nota promedio</div></div>
  <div class="card stat"><div class="v">${s.constancias}</div><div class="l">Constancias emitidas</div></div></div>`
        : ''
}
${admin && s.por_emitir > 0 ? `<div class="note" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><span><b>${s.por_emitir} docente${s.por_emitir > 1 ? 's' : ''}</b> aprobó y aún no tiene constancia.</span><button class="btn primary sm" data-act="emitir-todas">Emitir todas las constancias</button></div>` : ''}
<h2 style="margin:10px 0 6px">${isStaff() ? 'Participantes' : 'Mi participación'}</h2>
${
    c.inscritos.length
        ? `<div class="table-wrap"><table><thead><tr><th>Docente</th>${isStaff() ? '<th>Sede</th>' : ''}<th>Asistencia %</th><th>Nota</th><th>Resultado</th><th>Constancia</th>${admin ? '<th></th>' : ''}</tr></thead><tbody>${c.inscritos
              .map(
                  (i) => `<tr><td><b>${esc(i.docente)}</b></td>${isStaff() ? `<td>${esc(i.sede)}</td>` : ''}
  <td>${admin ? `<input type="number" min="0" max="100" step="1" value="${i.asistencia ?? ''}" data-f="asistencia" data-i="${i.id}" aria-label="Asistencia de ${esc(i.docente)}">` : i.asistencia != null ? Math.round(i.asistencia) + '%' : '—'}</td>
  <td>${admin ? `<input type="number" min="0" max="20" step="0.5" value="${i.nota ?? ''}" data-f="nota" data-i="${i.id}" aria-label="Nota de ${esc(i.docente)}">` : (i.nota ?? '—')}</td><td>${bInsc(i.estado)}</td>
  <td>${i.constancia_codigo ? dlBtn(`/api/inscripciones/${i.id}/constancia.pdf`, 'PDF', 'sm') : i.estado === 'aprobado' && admin ? `<button class="btn sm primary" data-act="emitir" data-id="${i.id}">Emitir</button>` : '<span class="muted">—</span>'}</td>
  ${admin ? `<td class="nowrap right"><button class="btn sm" data-act="guardar-res" data-id="${i.id}">Guardar</button> <button class="btn sm danger" data-act="quitar-insc" data-id="${i.id}" aria-label="Quitar a ${esc(i.docente)}">Quitar</button></td>` : ''}</tr>`,
              )
              .join('')}</tbody></table></div>`
        : `<div class="card">${empty('Todavía no hay participantes', admin ? 'Usa “Inscribir docentes” para comenzar.' : 'Inscríbete para participar.')}</div>`
}`);
}

/* ============================================================ Monitoreo */
// monitoreo del cumplimiento de capacitaciones obligatorias
const MON = { sede: '', estado: '' };
async function vMonitoreo() {
    FILT = await api('/api/docentes/filtros');
    const m = await api('/api/monitoreo?' + new URLSearchParams(MON));
    const fl = m.filas;
    view(`<div class="page-head"><div><h1>Monitoreo de capacitaciones</h1><p>Quién va al día, quién necesita un empujoncito y cómo avanza cada capacitación.</p></div><div class="actions">${dlBtn('/api/reportes/cumplimiento.xlsx', 'Descargar cumplimiento')}</div></div>
<div class="filters"><select id="ms" aria-label="Sede"><option value="">Todas las sedes</option>${FILT.sedes.map((s) => `<option ${s === MON.sede ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
  <select id="me" aria-label="Situación"><option value="">Toda situación</option>${Object.entries(CUMP)
      .map(([k, v]) => `<option value="${k}" ${k === MON.estado ? 'selected' : ''}>${v[0]}</option>`)
      .join('')}</select></div>
<div class="grid g3" style="margin-bottom:18px"><div class="card stat"><div class="v">${m.resumen.completadas}</div><div class="l">Capacitaciones completadas por ${m.resumen.docentes} docentes</div></div>
  <div class="card stat"><div class="v">${m.resumen.constancias}</div><div class="l">Constancias emitidas</div></div>
  <div class="card stat"><div class="v">${m.resumen.por_emitir}</div><div class="l">Constancias por emitir</div></div></div>
<h2 style="margin-bottom:10px">Capacitaciones completadas y cumplimiento por docente</h2>
${fl.length ? `<div class="table-wrap"><table><thead><tr><th>Docente</th><th>Sede</th><th>Obligatorias</th><th>Completadas</th><th>Horas</th><th>Constancias</th><th>Situación</th><th>Pendiente</th></tr></thead><tbody>${fl.map((x) => `<tr class="click" data-go="#/docentes/${x.docente_id}/capacitaciones"><td><b>${esc(x.docente)}</b></td><td>${esc(x.sede)}</td><td style="min-width:160px">${x.obligatorias_aprobadas} de ${x.obligatorias_total}${bar(x.pct, pctCls(x.pct))}</td><td>${x.completadas}</td><td>${x.horas} h</td><td>${x.constancias}${x.por_emitir ? ' ' + badge(x.por_emitir + ' por emitir', 'b-warn') : ''}</td><td>${bCump(x.estado)}</td><td class="small">${x.faltantes.length ? esc(x.faltantes.join('; ')) : '<span class="muted">—</span>'}</td></tr>`).join('')}</tbody></table></div>` : `<div class="card">${empty('Nada que mostrar con esos filtros')}</div>`}
<h2 style="margin:28px 0 10px">Avance por capacitación</h2>
<div class="table-wrap"><table><thead><tr><th>Capacitación</th><th>Estado</th><th>Inscritos</th><th>Asistencia prom.</th><th>Aprobación</th><th>Constancias</th></tr></thead><tbody>${m.capacitaciones
        .map((x) => {
            const s = x.stats;
            const ap = s.total - s.en_proceso ? Math.round((s.aprobados / (s.total - s.en_proceso)) * 100) : null;
            return `<tr class="click" data-go="#/capacitaciones/${x.id}"><td><b>${esc(x.titulo)}</b> ${x.obligatoria ? badge('Obligatoria', 'b-warn') : ''}</td><td>${bCap(x.estado)}</td><td>${s.total}</td><td style="min-width:140px">${s.asistencia != null ? s.asistencia + '%' + bar(s.asistencia, pctCls(s.asistencia)) : '<span class="muted">—</span>'}</td><td style="min-width:140px">${ap != null ? ap + '%' + bar(ap, pctCls(ap)) : '<span class="muted">en curso</span>'}</td><td>${s.constancias}${s.por_emitir > 0 ? ` ${badge(s.por_emitir + ' por emitir', 'b-warn')}` : ''}</td></tr>`;
        })
        .join('')}</tbody></table></div>`);
    $('#ms').onchange = (e) => {
        MON.sede = e.target.value;
        vMonitoreo();
    };
    $('#me').onchange = (e) => {
        MON.estado = e.target.value;
        vMonitoreo();
    };
}

/* ============================================================ Reportes y actividad */
// pantalla de reportes descargables
async function vReportes() {
    FILT = await api('/api/docentes/filtros');
    const card = (t, p, btns) =>
        `<div class="card"><h2>${t}</h2><p class="muted" style="margin-top:0">${p}</p><div class="actions">${btns}</div></div>`;
    view(`<div class="page-head"><div><h1>Reportes y descargas</h1><p>Información consolidada lista para compartir o analizar.</p></div></div>
<div class="grid g2">
${card('Consolidado de docentes', 'Datos de todos los docentes con sus evaluaciones, encuestas, supervisiones y horas de capacitación (4 hojas).', `<select id="rsede" aria-label="Sede" style="padding:9px;border:1px solid var(--line);border-radius:10px"><option value="">Todas las sedes</option>${FILT.sedes.map((s) => `<option>${esc(s)}</option>`).join('')}</select><button class="btn primary" data-act="rep-doc" data-fmt="xlsx">${ico('down')} Excel</button><button class="btn" data-act="rep-doc" data-fmt="csv">${ico('down')} CSV</button>`)}
${card('Capacitaciones y participantes', 'Resumen por capacitación (inscritos, aprobados, asistencia) y detalle de cada participante con su constancia.', dlBtn('/api/reportes/capacitaciones.xlsx', 'Excel', 'primary'))}
${card('Cumplimiento de obligatorias', 'Quién está al día, en proceso o pendiente, con las capacitaciones que le faltan a cada docente.', dlBtn('/api/reportes/cumplimiento.xlsx', 'Excel', 'primary'))}
${card('Fichas y constancias', 'La ficha completa en PDF se descarga desde el perfil de cada docente. Las constancias se emiten y descargan desde cada capacitación.', '<a class="btn" href="#/docentes">Ir a docentes</a><a class="btn" href="#/capacitaciones">Ir a capacitaciones</a>')}
</div>`);
}
// bitácora de actividad (solo admin)
async function vActividad() {
    const rows = await api('/api/auditoria');
    view(`<div class="page-head"><div><h1>Actividad reciente</h1><p>Un registro de lo que ocurre en el sistema, para dar tranquilidad y trazabilidad.</p></div></div>
<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>${rows.map((r) => `<tr><td class="nowrap">${esc(r.fecha)}</td><td>${esc(r.usuario)}</td><td>${badge(r.accion.replaceAll('_', ' ').toLowerCase(), 'b-mute')}</td><td>${esc(r.detalle)}</td></tr>`).join('')}</tbody></table></div>`);
}
