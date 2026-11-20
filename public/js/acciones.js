// acciones.js - parte del frontend de Gestión Docente CERTUS: formularios y botones (clics) y arranque de la app.
// Los archivos se cargan en orden desde index.html (base, sesion, vistas..., acciones) y comparten las mismas funciones.
'use strict';
/* ============================================================ Acciones */
// periodos disponibles en los formularios
const PERIODOS = ['2026-II', '2026-I', '2025-II', '2025-I', '2024-II'];
// acciones de los botones (se identifican con data-act en el HTML)
const ACT = {
    menu: () => $('#side').classList.toggle('open'),
    salir: () => logout(),
    clave: () =>
        formModal({
            title: 'Cambiar contraseña',
            intro: 'Usa al menos 8 caracteres, con letras y números.',
            submit: 'Actualizar',
            fields: [
                { name: 'actual', label: 'Contraseña actual', type: 'password', required: true, full: true },
                { name: 'nueva', label: 'Nueva contraseña', type: 'password', required: true, full: true },
            ],
            onSubmit: async (v) => {
                await api('/api/auth/cambiar-clave', { method: 'POST', body: v });
                toast('Contraseña actualizada.', 'ok');
            },
        }),
    'cap-filtro': (el) => {
        capFiltro = el.dataset.k;
        vCapacitaciones();
    },
    'nuevo-docente': () =>
        formModal({
            title: 'Nuevo docente',
            intro: 'Se creará su cuenta con la contraseña inicial de demostración; pídele que la cambie al ingresar.',
            fields: docenteFields(),
            submit: 'Crear docente',
            onSubmit: async (v) => {
                const r = await api('/api/docentes', { method: 'POST', body: v });
                toast('Docente registrado. Clave inicial: ' + r.clave_inicial, 'ok');
                location.hash = '#/docentes/' + r.id;
            },
        }),
    'edit-docente': () => {
        const d = CTX.ficha.docente;
        formModal({
            title: 'Editar datos del docente',
            fields: [
                ...docenteFields(),
                {
                    name: 'estado',
                    label: 'Estado',
                    type: 'select',
                    options: [
                        ['activo', 'Activo'],
                        ['inactivo', 'Inactivo'],
                    ],
                },
            ],
            values: d,
            submit: 'Guardar cambios',
            onSubmit: async (v) => {
                await api('/api/docentes/' + d.id, { method: 'PUT', body: v });
                toast('Cambios guardados.', 'ok');
                render();
            },
        });
    },
    baja: async (el) => {
        if (
            await confirmar(
                '¿Dar de baja a este docente?',
                'Su legajo se conserva completo, pero ya no podrá ingresar al sistema ni se le inscribirá en capacitaciones.',
                'Sí, dar de baja',
                true,
            )
        ) {
            await api('/api/docentes/' + el.dataset.id, { method: 'DELETE' });
            toast('Docente dado de baja.', 'ok');
            render();
        }
    },
    'add-eval': (el) =>
        formModal({
            title: 'Registrar evaluación semestral',
            fields: [
                { name: 'periodo', label: 'Periodo', type: 'select', options: PERIODOS },
                { name: 'puntaje', label: 'Puntaje (0–20)', type: 'number', min: 0, max: 20, step: 0.1, required: true },
                { name: 'comentario', label: 'Comentario', type: 'textarea', full: true },
            ],
            onSubmit: async (v) => {
                await api(`/api/docentes/${el.dataset.id}/evaluaciones`, { method: 'POST', body: v });
                toast('Evaluación registrada.', 'ok');
                render();
            },
        }),
    'add-enc': (el) =>
        formModal({
            title: 'Registrar resultado de encuesta',
            fields: [
                { name: 'periodo', label: 'Periodo', type: 'select', options: PERIODOS },
                { name: 'curso', label: 'Curso', required: true },
                { name: 'respuestas', label: 'N.º de respuestas', type: 'number', min: 0, required: true },
                { name: 'puntaje', label: 'Puntaje (0–5)', type: 'number', min: 0, max: 5, step: 0.1, required: true },
                { name: 'comentario', label: 'Comentario', type: 'textarea', full: true },
            ],
            onSubmit: async (v) => {
                await api(`/api/docentes/${el.dataset.id}/encuestas`, { method: 'POST', body: v });
                toast('Resultado registrado.', 'ok');
                render();
            },
        }),
    'add-sup': (el) =>
        formModal({
            title: 'Registrar supervisión de clase',
            intro: 'Escribe el feedback con calidez: es una conversación entre colegas.',
            fields: [
                { name: 'fecha', label: 'Fecha de la visita', type: 'date', required: true, default: today() },
                { name: 'curso', label: 'Curso', required: true },
                { name: 'puntaje', label: 'Puntaje (0–20)', type: 'number', min: 0, max: 20, step: 0.1, required: true },
                { name: 'fortalezas', label: 'Fortalezas observadas', type: 'textarea', full: true },
                { name: 'oportunidades', label: 'Oportunidades de mejora', type: 'textarea', full: true },
                { name: 'compromisos', label: 'Compromisos acordados', type: 'textarea', full: true },
            ],
            onSubmit: async (v) => {
                await api(`/api/docentes/${el.dataset.id}/supervisiones`, { method: 'POST', body: v });
                toast('Supervisión registrada.', 'ok');
                render();
            },
        }),
    del: async (el) => {
        if (await confirmar('¿Quitar este registro?', 'Esta acción no se puede deshacer.', 'Sí, quitar', true)) {
            await api(`/api/${el.dataset.tipo}/${el.dataset.id}`, { method: 'DELETE' });
            toast('Registro eliminado.', 'ok');
            render();
        }
    },
    'nueva-cap': () =>
        formModal({
            title: 'Nueva capacitación',
            fields: capFields(),
            submit: 'Crear capacitación',
            onSubmit: async (v) => {
                const r = await api('/api/capacitaciones', { method: 'POST', body: v });
                toast('Capacitación creada.', 'ok');
                location.hash = '#/capacitaciones/' + r.id;
            },
        }),
    'edit-cap': () => {
        const c = CTX.cap;
        formModal({
            title: 'Editar capacitación',
            fields: capFields(),
            values: c,
            submit: 'Guardar cambios',
            onSubmit: async (v) => {
                await api('/api/capacitaciones/' + c.id, { method: 'PUT', body: v });
                toast('Cambios guardados.', 'ok');
                render();
            },
        });
    },
    inscribir: () => {
        const c = CTX.cap;
        const libres = c.disponibles;
        const d =
            openDlg(`<div class="dlg-head"><h2>Inscribir docentes</h2><button class="x" data-close aria-label="Cerrar">×</button></div><div class="dlg-body"><p class="muted" style="margin-top:0">Quedan ${c.cupo - c.stats.total} cupos.</p>
  <input id="pf" type="search" placeholder="Buscar docente…" style="width:100%;padding:9px 12px;border:1px solid var(--line);border-radius:10px"><div class="pick" id="pk">${libres.length ? libres.map((x) => `<label data-n="${esc(x.nombre.toLowerCase())}"><input type="checkbox" value="${x.id}"> <span>${esc(x.nombre)} <span class="muted small">· ${esc(x.sede)}</span></span></label>`).join('') : '<div class="empty">Todos los docentes activos ya están inscritos.</div>'}</div><div id="mferr"></div></div>
  <div class="dlg-foot"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="go">Inscribir seleccionados</button></div>`);
        $('#pf', d).oninput = (e) => {
            const q = e.target.value.toLowerCase();
            d.querySelectorAll('#pk label').forEach((l) => (l.style.display = l.dataset.n.includes(q) ? '' : 'none'));
        };
        $('#go', d).onclick = async () => {
            const ids = [...d.querySelectorAll('#pk input:checked')].map((i) => Number(i.value));
            try {
                const r = await api(`/api/capacitaciones/${c.id}/inscripciones`, { method: 'POST', body: { docente_ids: ids } });
                closeDlg();
                toast(`${r.inscritos} docente(s) inscrito(s).`, 'ok');
                render();
            } catch (e) {
                $('#mferr', d).innerHTML = `<div class="form-error">${esc(e.message)}</div>`;
            }
        };
    },
    inscribirme: async (el) => {
        await api(`/api/capacitaciones/${el.dataset.id}/inscribirme`, { method: 'POST' });
        toast('¡Listo! Ya estás inscrito.', 'ok');
        render();
    },
    'guardar-res': async (el) => {
        const id = el.dataset.id;
        const val = (f) => document.querySelector(`input[data-f=${f}][data-i="${id}"]`).value;
        const r = await api('/api/inscripciones/' + id, { method: 'PUT', body: { asistencia: val('asistencia'), nota: val('nota') } });
        toast(
            r.estado === 'aprobado'
                ? 'Guardado: aprobó. Ya puedes emitir su constancia.'
                : r.estado === 'desaprobado'
                  ? 'Guardado: no alcanzó los mínimos para aprobar.'
                  : 'Guardado. Falta asistencia o nota para calcular el resultado.',
            'ok',
        );
        if (r.constancia_anulada) toast('Se anuló su constancia porque el resultado ya no es aprobado.', 'err');
        render();
    },
    'quitar-insc': async (el) => {
        if (await confirmar('¿Quitar de la capacitación?', 'Se eliminará su inscripción y resultados.', 'Sí, quitar', true)) {
            await api('/api/inscripciones/' + el.dataset.id, { method: 'DELETE' });
            toast('Participante retirado.', 'ok');
            render();
        }
    },
    emitir: async (el) => {
        const r = await api(`/api/inscripciones/${el.dataset.id}/constancia`, { method: 'POST' });
        toast('Constancia emitida: ' + r.codigo, 'ok');
        render();
    },
    'emitir-pendientes': async () => {
        const r = await api('/api/constancias/emitir-pendientes', { method: 'POST' });
        toast(`${r.emitidas} constancia(s) emitida(s).`, 'ok');
        render();
    },
    'emitir-todas': async () => {
        const r = await api(`/api/capacitaciones/${CTX.cap.id}/constancias`, { method: 'POST' });
        toast(`${r.emitidas} constancia(s) emitida(s).`, 'ok');
        render();
    },
    'ver-clave': () => {
        const pw = $('#pw');
        pw.type = pw.type === 'password' ? 'text' : 'password';
    },
    registro: () => renderRegistro(),
    'volver-login': () => renderLogin(),
    olvido: () => toast('Para restablecer tu contraseña, comunícate con Gestión Docente.'),
    'rep-doc': (el) => descargar(`/api/reportes/docentes.${el.dataset.fmt}?sede=${encodeURIComponent($('#rsede').value)}`).catch(fail),
};
// un solo listener de clics para todos los botones de la app
document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-close]')) return closeDlg();
    // Gestión Docente / Supervisión / Docente: solo marcan el perfil. No rellenan correo ni contraseña:
    // los escribe la persona (el navegador puede guardarlos y "Recordar mi sesión" guarda el correo).
    const rolBtn = t.closest('[data-rol]');
    if (rolBtn) {
        document.querySelectorAll('.demo .btn').forEach((b) => b.classList.toggle('sel', b === rolBtn));
        const em = $('#em');
        em.focus();
        return;
    }
    const dl = t.closest('[data-dl]');
    if (dl) return void descargar(dl.dataset.dl).catch(fail);
    const act = t.closest('[data-act]');
    if (act && act.tagName === 'A') e.preventDefault();
    if (act && ACT[act.dataset.act]) return void Promise.resolve(ACT[act.dataset.act](act)).catch(fail);
    const go = t.closest('[data-go]');
    if (go && !t.closest('button,a,input')) location.hash = go.dataset.go;
});
// al arrancar: cambia la vista cuando cambia el # y se dibuja la app
window.addEventListener('hashchange', render);
renderApp();
if (S.token && S.user) api('/api/auth/me').catch(() => {});
