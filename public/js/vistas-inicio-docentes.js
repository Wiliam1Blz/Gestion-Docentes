// vistas-inicio-docentes.js - parte del frontend de Gestión Docente CERTUS: vistas de inicio (panel) y docentes (lista y ficha).
// Los archivos se cargan en orden desde index.html (base, sesion, vistas..., acciones) y comparten las mismas funciones.
'use strict';
/* ============================================================ Inicio */
// dashboard para admin y supervisión (alertas, indicadores y gráficos)
async function vInicio() {
    const d = await api('/api/dashboard');
    if (d.tipo === 'docente') return vInicioDocente(d);
    const k = d.kpis;
    const c = d.cumplimiento;
    const tot = c.al_dia + c.en_proceso + c.pendiente || 1;
    const maxEv = 20;
    view(`<section class="hello"><h1>${saludo()}, equipo</h1>
<p>${d.alertas.length ? 'Esto es lo que hoy merece tu atención.' : 'Todo en orden por ahora. Gracias por cuidar al equipo docente.'}</p></section>
${d.alertas.length ? `<div class="alerts">${d.alertas.map((a) => (a.accion ? `<div class="alert con-accion ${a.nivel}"><span>${esc(a.texto)}</span><span class="go"><button class="btn sm primary" data-act="${a.accion}">Emitir todas ahora</button><a href="${a.link}">Ver →</a></span></div>` : `<a class="alert ${a.nivel}" href="${a.link}"><span>${esc(a.texto)}</span><span class="go">Ver →</span></a>`)).join('')}</div>` : ''}
<div class="grid k6" style="margin-bottom:16px">
  <div class="card stat"><div class="v">${k.docentes_activos}</div><div class="l">Docentes activos</div></div>
  <div class="card stat"><div class="v">${k.prom_evaluacion ?? '—'}<small> / 20</small></div><div class="l">Evaluación promedio ${esc(d.periodo || '')}</div></div>
  <div class="card stat"><div class="v">${k.prom_encuesta ?? '—'}<small> / 5</small></div><div class="l">Satisfacción estudiantil</div></div>
  <div class="card stat"><div class="v">${k.cumplimiento}%</div><div class="l">Docentes al día en obligatorias</div></div>
  <div class="card stat"><div class="v">${k.horas_totales}<small> h</small></div><div class="l">Horas de capacitación aprobadas</div></div>
  <div class="card stat"><div class="v">${k.caps_en_curso}</div><div class="l">Capacitaciones en curso</div></div></div>
<div class="grid g2">
  <div class="card"><h2>Evolución de la evaluación docente</h2><div class="chart"><div class="yaxis" aria-hidden="true"><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span></div><div class="plot">${d.evolucion.map((e, i, a) => `<div class="col${i === a.length - 1 ? ' last' : ''}"><b>${e.prom_eval}</b><i style="--h:${e.prom_eval / maxEv}"></i><span>${esc(e.periodo)}</span></div>`).join('')}</div></div>
    <p class="small muted" style="margin-bottom:0">Promedio institucional sobre 20 puntos.</p></div>
  <div class="card"><h2>Cumplimiento de capacitaciones obligatorias</h2>
    <div class="stack" role="img" aria-label="Al día ${c.al_dia}, en proceso ${c.en_proceso}, pendientes ${c.pendiente}"><i style="width:${(c.al_dia / tot) * 100}%;background:var(--ok)"></i><i style="width:${(c.en_proceso / tot) * 100}%;background:var(--gold)"></i><i style="width:${(c.pendiente / tot) * 100}%;background:var(--coral)"></i></div>
    <div class="legend"><span style="--c:var(--ok)">Al día: ${c.al_dia}</span><span style="--c:var(--gold)">En proceso: ${c.en_proceso}</span><span style="--c:var(--coral)">Pendientes: ${c.pendiente}</span></div>
    <h3 style="margin:20px 0 4px">Evaluación por sede</h3>${d.por_sede.map((s) => `<div class="rowbar"><span>${esc(s.sede)}</span>${bar(((s.prom || 0) / 20) * 100, pctCls(((s.prom || 0) / 20) * 100))}<b>${s.prom ?? '—'}</b></div>`).join('')}</div>
  <div class="card" style="grid-column:1/-1"><h2>Capacitaciones activas y próximas</h2>${d.capacitaciones.length ? `<div class="table-wrap"><table><thead><tr><th>Capacitación</th><th>Estado</th><th>Fechas</th><th>Inscritos</th></tr></thead><tbody>${d.capacitaciones.map((x) => `<tr class="click" data-go="#/capacitaciones/${x.id}"><td><b>${esc(x.titulo)}</b> ${x.obligatoria ? badge('Obligatoria', 'b-warn') : ''}</td><td>${bCap(x.estado)}</td><td class="nowrap">${fmtDate(x.fecha_inicio)} – ${fmtDate(x.fecha_fin)}</td><td style="min-width:150px">${x.inscritos}/${x.cupo}${bar((x.inscritos / x.cupo) * 100)}</td></tr>`).join('')}</tbody></table></div>` : empty('No hay capacitaciones activas', 'Crea una desde la sección Capacitaciones.')}</div></div>`);
}
// inicio para el docente (solo ve lo suyo)
function vInicioDocente(d) {
    const r = d.resumen;
    const pend = r.faltantes;
    view(`<section class="hello"><h1>${saludo()}, ${esc(d.docente.nombres.split(' ')[0])}</h1><p>Gracias por tu trabajo en el aula. Aquí tienes tu resumen.</p></section>
${pend.length ? `<div class="note"><b>Te falta completar ${pend.length === 1 ? 'una capacitación obligatoria' : pend.length + ' capacitaciones obligatorias'}:</b> ${pend.map(esc).join('; ')}. <a href="#/capacitaciones">Ver capacitaciones</a></div>` : '<div class="note ok"><b>¡Estás al día!</b> Completaste todas las capacitaciones obligatorias.</div>'}
${r.obligatorias_total ? `<div class="card" style="margin-bottom:16px"><h2 style="margin-bottom:8px">Mi progreso en capacitaciones obligatorias</h2><p style="margin:0 0 8px"><b>${r.obligatorias_aprobadas} de ${r.obligatorias_total}</b> aprobadas · ${r.horas_aprobadas} h acumuladas</p>${bar(Math.round((r.obligatorias_aprobadas / r.obligatorias_total) * 100), pctCls(Math.round((r.obligatorias_aprobadas / r.obligatorias_total) * 100)))}</div>` : ''}
<div class="grid g6" style="margin-bottom:16px"><div class="card stat"><div class="v">${r.ultima_evaluacion ?? '—'}<small> / 20</small></div><div class="l">Última evaluación ${esc(r.ultimo_periodo || '')}</div></div>
  <div class="card stat"><div class="v">${r.prom_encuesta ?? '—'}<small> / 5</small></div><div class="l">Encuestas de estudiantes</div></div>
  <div class="card stat"><div class="v">${r.prom_supervision ?? '—'}<small> / 20</small></div><div class="l">Supervisión de clases</div></div>
  <div class="card stat"><div class="v">${r.horas_aprobadas}<small> h</small></div><div class="l">Horas de capacitación</div></div></div>
<div class="grid g2"><div class="card"><h2>Mis próximas capacitaciones</h2>${d.proximas.length ? d.proximas.map((x) => `<p style="margin:0 0 10px"><a href="#/capacitaciones/${x.capacitacion_id}"><b>${esc(x.titulo)}</b></a><br><span class="muted small">${fmtDate(x.fecha_inicio)} – ${fmtDate(x.fecha_fin)} · ${x.horas} h</span></p>`).join('') : '<p class="muted">No tienes capacitaciones en curso. <a href="#/capacitaciones">Explora las disponibles</a>.</p>'}</div>
<div class="card"><h2>Mis constancias</h2>${d.constancias.length ? d.constancias.map((x) => `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px"><div><b>${esc(x.titulo)}</b><br><span class="muted small">${fmtDate(x.constancia_fecha)} · ${x.horas} h</span></div>${dlBtn(`/api/inscripciones/${x.inscripcion_id}/constancia.pdf`, 'PDF', 'sm')}</div>`).join('') : '<p class="muted">Cuando apruebes una capacitación, tu constancia aparecerá aquí.</p>'}
<div class="actions" style="margin-top:14px">${d.constancias.length > 1 ? dlBtn(`/api/docentes/${d.docente.id}/constancias.zip`, `Descargar las ${d.constancias.length} constancias (ZIP)`, 'primary') : ''}${dlBtn(`/api/docentes/${d.docente.id}/ficha.pdf`, 'Descargar mi ficha completa')}</div></div></div>`);
}

/* ============================================================ Docentes */
// lista de docentes con filtros
let FILT = { sedes: [], programas: [] };
const optsDoc = () => ({ sede: FILT.sedes, programa: FILT.programas });
async function vDocentes() {
    FILT = await api('/api/docentes/filtros');
    view(`<div class="page-head"><div><h1>Docentes</h1><p>El legajo de cada docente, siempre actualizado.</p></div><div class="actions">${isAdmin() ? '<button class="btn primary" data-act="nuevo-docente">' + ico('plus') + ' Nuevo docente</button>' : ''}${dlBtn('/api/reportes/docentes.xlsx', 'Exportar Excel')}</div></div>
<div class="filters"><input id="q" type="search" placeholder="Buscar por nombre, DNI, código o correo…" aria-label="Buscar docente">
  <select id="fs" aria-label="Sede"><option value="">Todas las sedes</option>${FILT.sedes.map((s) => `<option>${esc(s)}</option>`).join('')}</select>
  <select id="fp" aria-label="Programa"><option value="">Todos los programas</option>${FILT.programas.map((s) => `<option>${esc(s)}</option>`).join('')}</select>
  <select id="fe" aria-label="Estado"><option value="">Todos</option><option value="activo" selected>Activos</option><option value="inactivo">Inactivos</option></select></div>
<div id="tbl"></div>`);
    let t;
    const go = () => cargarDocentes();
    $('#q').addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(go, 250);
    });
    ['fs', 'fp', 'fe'].forEach((id) => $('#' + id).addEventListener('change', go));
    go();
}
// pide los docentes al servidor aplicando los filtros
async function cargarDocentes() {
    const p = new URLSearchParams({ q: $('#q').value, sede: $('#fs').value, programa: $('#fp').value, estado: $('#fe').value });
    try {
        const rows = await api('/api/docentes?' + p);
        $('#tbl').innerHTML = rows.length
            ? `<div class="table-wrap"><table><thead><tr><th>Docente</th><th>Sede</th><th>Programa</th><th>Última evaluación</th><th>Horas capacitación</th><th>Estado</th></tr></thead><tbody>${rows.map((d) => `<tr class="click" data-go="#/docentes/${d.id}"><td><div class="person"><div class="avatar">${initials(d.nombres + ' ' + d.apellidos)}</div><div><b>${esc(d.apellidos)}, ${esc(d.nombres)}</b><span class="muted small">${esc(d.codigo)} · ${esc(d.email)}</span></div></div></td><td>${esc(d.sede)}</td><td>${esc(d.programa)}</td><td>${scoreBadge(d.ultima_eval)}</td><td>${d.horas} h</td><td>${badge(d.estado === 'activo' ? 'Activo' : 'Inactivo', d.estado === 'activo' ? 'b-ok' : 'b-mute')}</td></tr>`).join('')}</tbody></table></div><p class="small muted">${rows.length} docente${rows.length === 1 ? '' : 's'}</p>`
            : `<div class="card">${empty('No encontramos docentes con esos filtros', 'Prueba con otra búsqueda o limpia los filtros.')}</div>`;
    } catch (e) {
        fail(e);
    }
}
// campos del formulario de docente
const docenteFields = () => [
    { name: 'nombres', label: 'Nombres', required: true },
    { name: 'apellidos', label: 'Apellidos', required: true },
    { name: 'dni', label: 'DNI', required: true, placeholder: '8 dígitos' },
    { name: 'email', label: 'Correo institucional', type: 'email', required: true, placeholder: 'nombre.apellido@certus.edu.pe' },
    { name: 'telefono', label: 'Teléfono' },
    { name: 'fecha_nacimiento', label: 'Fecha de nacimiento', type: 'date' },
    { name: 'direccion', label: 'Dirección', full: true },
    { name: 'sede', label: 'Sede', required: true, list: optsDoc().sede },
    { name: 'programa', label: 'Programa', required: true, list: optsDoc().programa },
    { name: 'categoria', label: 'Categoría', type: 'select', options: ['Tiempo parcial', 'Tiempo completo'] },
    { name: 'grado_academico', label: 'Grado académico', list: ['Bachiller', 'Licenciado', 'Magíster', 'Doctor'] },
    { name: 'especialidad', label: 'Especialidad' },
    { name: 'fecha_ingreso', label: 'Fecha de ingreso', type: 'date' },
    { name: 'observaciones', label: 'Observaciones', type: 'textarea', full: true },
];
// ficha del docente con pestañas (datos, evaluaciones, encuestas, supervisiones, capacitaciones)
async function vFicha(id, tab) {
    const f = await api('/api/docentes/' + id);
    const d = f.docente;
    const r = f.resumen;
    const nombre = `${d.nombres} ${d.apellidos}`;
    const tabs = [
        ['resumen', 'Resumen'],
        ['evaluaciones', `Evaluaciones (${f.evaluaciones.length})`],
        ['encuestas', `Encuestas (${f.encuestas.length})`],
        ['supervisiones', `Supervisiones (${f.supervisiones.length})`],
        ['capacitaciones', `Capacitaciones (${f.capacitaciones.length})`],
    ];
    const add = (act, label) => `<button class="btn primary sm" data-act="${act}" data-id="${id}">${ico('plus')} ${label}</button>`;
    let body = '';
    if (tab === 'resumen') {
        body = `<div class="grid g6" style="margin-bottom:16px"><div class="card stat"><div class="v">${r.ultima_evaluacion ?? '—'}<small> / 20</small></div><div class="l">Última evaluación ${esc(r.ultimo_periodo || '')}</div></div>
  <div class="card stat"><div class="v">${r.prom_evaluacion ?? '—'}<small> / 20</small></div><div class="l">Promedio histórico</div></div>
  <div class="card stat"><div class="v">${r.prom_encuesta ?? '—'}<small> / 5</small></div><div class="l">Encuestas</div></div>
  <div class="card stat"><div class="v">${r.prom_supervision ?? '—'}<small> / 20</small></div><div class="l">Supervisiones</div></div>
  <div class="card stat"><div class="v">${r.horas_aprobadas}<small> h</small></div><div class="l">Horas de capacitación</div></div></div>
  ${r.cumplimiento ? `<div class="note ${r.cumplimiento === 'al_dia' ? 'ok' : ''}">Capacitaciones obligatorias: <b>${r.obligatorias_aprobadas} de ${r.obligatorias_total}</b> aprobadas. ${r.faltantes.length ? 'Pendiente: ' + r.faltantes.map(esc).join('; ') + '.' : '¡Está al día!'}</div>` : ''}
  <div class="card"><h2>Datos personales y laborales</h2><div class="kv">${[
      ['DNI', d.dni],
      ['Correo institucional', d.email],
      ['Teléfono', d.telefono],
      ['Fecha de nacimiento', fmtDate(d.fecha_nacimiento)],
      ['Dirección', d.direccion],
      ['Sede', d.sede],
      ['Programa', d.programa],
      ['Categoría', d.categoria],
      ['Grado académico', d.grado_academico],
      ['Especialidad', d.especialidad],
      ['Fecha de ingreso', fmtDate(d.fecha_ingreso)],
  ]
      .map(([k, v]) => `<div><span>${k}</span>${esc(v || '—')}</div>`)
      .join(
          '',
      )}</div>${d.observaciones ? `<p style="margin-bottom:0"><span class="muted small">OBSERVACIONES</span><br>${esc(d.observaciones)}</p>` : ''}</div>`;
    } else if (tab === 'evaluaciones') {
        body =
            `<div class="actions" style="justify-content:flex-end;margin-bottom:12px">${isStaff() ? add('add-eval', 'Registrar evaluación') : ''}</div>` +
            (f.evaluaciones.length
                ? `<div class="table-wrap"><table><thead><tr><th>Periodo</th><th>Puntaje</th><th>Evaluador</th><th>Comentario</th>${isAdmin() ? '<th></th>' : ''}</tr></thead><tbody>${f.evaluaciones.map((e) => `<tr><td><b>${esc(e.periodo)}</b></td><td>${scoreBadge(e.puntaje)} <span class="muted small">/ 20</span></td><td>${esc(e.evaluador)}</td><td>${esc(e.comentario)}</td>${isAdmin() ? `<td class="right"><button class="btn sm danger" data-act="del" data-tipo="evaluaciones" data-id="${e.id}">Quitar</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`
                : `<div class="card">${empty('Aún no hay evaluaciones', 'Se registrarán al cierre de cada semestre.')}</div>`);
    } else if (tab === 'encuestas') {
        body =
            `<div class="actions" style="justify-content:flex-end;margin-bottom:12px">${isAdmin() ? add('add-enc', 'Registrar resultado') : ''}</div>` +
            (f.encuestas.length
                ? `<div class="table-wrap"><table><thead><tr><th>Periodo</th><th>Curso</th><th>Respuestas</th><th>Puntaje</th><th>Comentario</th>${isAdmin() ? '<th></th>' : ''}</tr></thead><tbody>${f.encuestas.map((e) => `<tr><td><b>${esc(e.periodo)}</b></td><td>${esc(e.curso)}</td><td>${e.respuestas}</td><td>${scoreBadge(e.puntaje, 5)} <span class="muted small">/ 5</span></td><td>${esc(e.comentario)}</td>${isAdmin() ? `<td class="right"><button class="btn sm danger" data-act="del" data-tipo="encuestas" data-id="${e.id}">Quitar</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`
                : `<div class="card">${empty('Aún no hay encuestas', 'Los resultados llegan al finalizar cada ciclo.')}</div>`);
    } else if (tab === 'supervisiones') {
        body =
            `<div class="actions" style="justify-content:flex-end;margin-bottom:12px">${isStaff() ? add('add-sup', 'Registrar supervisión') : ''}</div>` +
            (f.supervisiones.length
                ? f.supervisiones
                      .map(
                          (
                              s,
                          ) => `<article class="sup"><h3><span>${esc(s.curso)} <span class="muted small" style="font-family:var(--sans)">· ${fmtDate(s.fecha)}</span></span>${scoreBadge(s.puntaje)}</h3>
  <p class="small muted" style="margin:2px 0 0">Visita de ${esc(s.supervisor)}</p><dl><dt>Fortalezas</dt><dd>${esc(s.fortalezas || '—')}</dd><dt>Oportunidades de mejora</dt><dd>${esc(s.oportunidades || '—')}</dd><dt>Compromisos</dt><dd>${esc(s.compromisos || '—')}</dd></dl>
  ${isAdmin() ? `<div style="text-align:right"><button class="btn sm danger" data-act="del" data-tipo="supervisiones" data-id="${s.id}">Quitar</button></div>` : ''}</article>`,
                      )
                      .join('')
                : `<div class="card">${empty('Sin visitas de supervisión', 'Cuando se acompañe una clase, el feedback quedará aquí.')}</div>`);
    } else {
        body = f.capacitaciones.length
            ? `<div class="table-wrap"><table><thead><tr><th>Capacitación</th><th>Horas</th><th>Asistencia</th><th>Nota</th><th>Estado</th><th>Constancia</th></tr></thead><tbody>${f.capacitaciones
                  .map(
                      (
                          c,
                      ) => `<tr><td><a href="#/capacitaciones/${c.capacitacion_id}"><b>${esc(c.titulo)}</b></a> ${c.obligatoria ? badge('Obligatoria', 'b-warn') : ''}<br><span class="muted small">${fmtDate(c.fecha_inicio)} – ${fmtDate(c.fecha_fin)}</span></td><td>${c.horas}</td><td>${c.asistencia != null ? Math.round(c.asistencia) + '%' : '—'}</td><td>${c.nota ?? '—'}</td><td>${bInsc(c.estado)}</td>
  <td>${c.constancia_codigo ? dlBtn(`/api/inscripciones/${c.inscripcion_id}/constancia.pdf`, 'PDF', 'sm') : c.estado === 'aprobado' && isAdmin() ? `<button class="btn sm primary" data-act="emitir" data-id="${c.inscripcion_id}">Emitir</button>` : '<span class="muted">—</span>'}</td></tr>`,
                  )
                  .join('')}</tbody></table></div>`
            : `<div class="card">${empty('Sin capacitaciones todavía', isStaff() ? 'Inscríbelo desde la sección Capacitaciones.' : 'Revisa las capacitaciones disponibles.')}</div>`;
    }
    view(`${isStaff() ? '<p style="margin:0 0 10px"><a href="#/docentes">← Volver a docentes</a></p>' : ''}
<div class="page-head"><div class="person"><div class="avatar lg">${initials(nombre)}</div><div><h1>${esc(nombre)}</h1><p>${esc(d.codigo)} · ${esc(d.programa)} · ${esc(d.sede)} ${badge(d.estado === 'activo' ? 'Activo' : 'Inactivo', d.estado === 'activo' ? 'b-ok' : 'b-mute')}</p></div></div>
<div class="actions">${dlBtn(`/api/docentes/${id}/ficha.pdf`, 'Ficha completa (PDF)', 'primary')}${isAdmin() ? `<button class="btn" data-act="edit-docente" data-id="${id}">Editar datos</button>${d.estado === 'activo' ? `<button class="btn danger" data-act="baja" data-id="${id}">Dar de baja</button>` : ''}` : ''}</div></div>
<nav class="tabs" aria-label="Secciones de la ficha">${tabs.map(([k, l]) => `<a href="#/docentes/${id}/${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>${body}`);
    CTX.ficha = f;
}
// guarda datos de la vista actual para usarlos en las acciones
const CTX = {};
