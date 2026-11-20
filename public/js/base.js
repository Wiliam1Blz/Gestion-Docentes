// base.js - parte del frontend de Gestión Docente CERTUS: utilidades, diálogos/formularios y piezas visuales (iconos, insignias, barras).
// Los archivos se cargan en orden desde index.html (base, sesion, vistas..., acciones) y comparten las mismas funciones.
'use strict';
/* ============================================================ Utilidades */
// atajo para querySelector
const $ = (s, el = document) => el.querySelector(s);
// escapa el texto para que no se meta HTML raro (seguridad)
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// estado de la sesión: token y datos del usuario que inició sesión
const S = { token: null, user: null };
try {
    S.token = sessionStorage.getItem('tk');
    S.user = JSON.parse(sessionStorage.getItem('us') || 'null');
} catch {}
// guarda o borra la sesión en sessionStorage
const saveSession = () => {
    try {
        S.token
            ? (sessionStorage.setItem('tk', S.token), sessionStorage.setItem('us', JSON.stringify(S.user)))
            : (sessionStorage.removeItem('tk'), sessionStorage.removeItem('us'));
    } catch {}
};
// helpers para saber el rol del usuario
const isAdmin = () => S.user?.rol === 'admin';
const isStaff = () => S.user && S.user.rol !== 'docente';
// fecha en formato corto para mostrar en pantalla
const fmtDate = (iso) =>
    iso ? new Date(iso.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
// iniciales del nombre para el avatar
const initials = (n) =>
    String(n)
        .replace(',', '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0])
        .join('')
        .toUpperCase();
const today = () => new Date().toISOString().slice(0, 10);

// función general para llamar al servidor (manda el token y maneja errores)
async function api(path, { method = 'GET', body } = {}) {
    const r = await fetch(path, {
        method,
        headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && S.user) {
        logout();
        toast('Tu sesión expiró. Vuelve a ingresar, por favor.', 'err');
        throw new Error(data.error);
    }
    if (!r.ok) throw new Error(data.error || 'Algo salió mal. Inténtalo de nuevo.');
    return data;
}
// descarga un archivo (PDF, Excel, ZIP) desde el servidor
async function descargar(path) {
    toast('Preparando tu archivo…');
    const r = await fetch(path, { headers: { Authorization: 'Bearer ' + S.token } });
    if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || 'No pudimos generar el archivo.');
    }
    const name = (r.headers.get('Content-Disposition') || '').match(/filename="(.+)"/)?.[1] || 'archivo';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await r.blob());
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Listo, tu archivo se descargó.', 'ok');
}
// mensajito que aparece abajo a la derecha
function toast(msg, type = '') {
    const box = $('#toasts');
    while (box.children.length >= 2) box.firstChild.remove();
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.textContent = msg;
    box.append(t);
    setTimeout(() => t.remove(), type === 'err' ? 6000 : 3500);
}
const fail = (e) => toast(e.message, 'err');

/* ============================================================ Diálogos y formularios */
const dlg = () => $('#dlg');
// abre y cierra la ventana emergente (modal)
function openDlg(html) {
    const d = dlg();
    d.innerHTML = html;
    if (!d.open) d.showModal();
    return d;
}
function closeDlg() {
    const d = dlg();
    if (d.open) d.close();
}
// arma el HTML de cada campo del formulario
function fieldHtml(f, v) {
    const val = v[f.name] ?? f.default ?? '';
    const id = 'f_' + f.name;
    const req = f.required ? 'required' : '';
    let input;
    if (f.type === 'select')
        input = `<select id="${id}" name="${f.name}" ${req}>${f.options
            .map((o) => {
                const [a, b] = Array.isArray(o) ? o : [o, o];
                return `<option value="${esc(a)}" ${String(a) === String(val) ? 'selected' : ''}>${esc(b)}</option>`;
            })
            .join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea id="${id}" name="${f.name}" maxlength="${f.max || 600}" ${req}>${esc(val)}</textarea>`;
    else if (f.type === 'checkbox')
        return `<div class="field ${f.full ? 'full' : ''}"><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="${f.name}" ${val ? 'checked' : ''} style="width:auto"> ${esc(f.label)}</label>${f.help ? `<div class="help">${esc(f.help)}</div>` : ''}</div>`;
    else
        input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(val)}" ${req} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null && f.type === 'number' ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''} ${f.list ? `list="l_${f.name}"` : ''} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ''} autocomplete="off">${f.list ? `<datalist id="l_${f.name}">${f.list.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}`;
    return `<div class="field ${f.full ? 'full' : ''}"><label for="${id}">${esc(f.label)}${f.required ? ' *' : ''}</label>${input}${f.help ? `<div class="help">${esc(f.help)}</div>` : ''}</div>`;
}
// formulario dentro de un modal; valida y llama a onSubmit al guardar
function formModal({ title, intro = '', fields, values = {}, submit = 'Guardar', onSubmit }) {
    const d =
        openDlg(`<form id="mf" novalidate><div class="dlg-head"><h2>${esc(title)}</h2><button type="button" class="x" data-close aria-label="Cerrar">×</button></div>
<div class="dlg-body">${intro ? `<p class="muted" style="margin-top:0">${intro}</p>` : ''}<div class="form">${fields.map((f) => fieldHtml(f, values)).join('')}</div><div id="mferr"></div></div>
<div class="dlg-foot"><button type="button" class="btn" data-close>Cancelar</button><button class="btn primary" type="submit">${esc(submit)}</button></div></form>`);
    const form = $('#mf', d);
    const first = form.querySelector('input,select,textarea');
    first && first.focus();
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;
        const out = {};
        fields.forEach((f) => {
            const el = form.elements[f.name];
            out[f.name] = f.type === 'checkbox' ? el.checked : el.value;
        });
        const btn = $('button[type=submit]', form);
        btn.disabled = true;
        try {
            await onSubmit(out);
            closeDlg();
        } catch (err) {
            $('#mferr', form).innerHTML = `<div class="form-error" role="alert">${esc(err.message)}</div>`;
            btn.disabled = false;
        }
    });
}
// ventana de confirmación, devuelve true o false
function confirmar(titulo, texto, label = 'Sí, continuar', peligro = false) {
    return new Promise((res) => {
        const d = openDlg(`<div class="dlg-head"><h2>${esc(titulo)}</h2></div><div class="dlg-body"><p style="margin-top:0">${texto}</p></div>
  <div class="dlg-foot"><button class="btn" data-r="0">Cancelar</button><button class="btn ${peligro ? 'danger' : 'primary'}" data-r="1">${esc(label)}</button></div>`);
        d.onclick = (e) => {
            const b = e.target.closest('[data-r]');
            if (b) {
                d.onclick = null;
                closeDlg();
                res(b.dataset.r === '1');
            }
        };
        d.oncancel = () => res(false);
    });
}

/* ============================================================ Piezas visuales */
// iconos en SVG
const ICON = {
    home: '<rect width="7" height="9" x="3" y="3" rx="1.5"/><rect width="7" height="5" x="14" y="3" rx="1.5"/><rect width="7" height="9" x="14" y="12" rx="1.5"/><rect width="7" height="5" x="3" y="16" rx="1.5"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    book: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
    pulse: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M8 18v-2M12 18v-4M16 18v-6"/>',
    clock: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    down: '<path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
};
const ico = (n) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
const badge = (txt, cls) => `<span class="badge ${cls}">${esc(txt)}</span>`;
// textos y colores de las insignias según el estado
const INSC = {
    inscrito: ['En proceso', 'b-info'],
    aprobado: ['Aprobado', 'b-ok'],
    desaprobado: ['Desaprobado', 'b-bad'],
    retirado: ['Retirado', 'b-mute'],
    sin_inscripcion: ['Sin inscribir', 'b-bad'],
};
const CAPE = {
    programada: ['Programada', 'b-info'],
    en_curso: ['En curso', 'b-teal'],
    finalizada: ['Finalizada', 'b-mute'],
    cancelada: ['Cancelada', 'b-bad'],
};
const CUMP = { al_dia: ['Al día', 'b-ok'], en_proceso: ['En proceso', 'b-warn'], pendiente: ['Pendiente', 'b-bad'] };
const bInsc = (e) => badge(...INSC[e]);
const bCap = (e) => badge(...CAPE[e]);
const bCump = (e) => badge(...CUMP[e]);
// insignia de color según la nota
const scoreBadge = (v, max = 20) =>
    v == null ? '<span class="muted">—</span>' : badge(`${v}`, v / max >= 0.8 ? 'b-ok' : v / max >= 0.7 ? 'b-warn' : 'b-bad');
// barra de progreso
const bar = (pct, cls = '') =>
    `<div class="bar ${cls}" role="img" aria-label="${pct}%"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
const pctCls = (p) => (p >= 80 ? 'ok' : p >= 50 ? 'warn' : 'bad');
const empty = (t, s = '') => `<div class="empty"><b>${esc(t)}</b>${esc(s)}</div>`;
const dlBtn = (url, label, cls = '') => `<button class="btn ${cls}" data-dl="${esc(url)}">${ico('down')} ${esc(label)}</button>`;
// pone el contenido en la zona principal
const view = (html) => {
    $('#view').innerHTML = html;
    window.scrollTo(0, 0);
};
function etiquetarTablas() {
    // cada celda lleva el nombre de su columna (para la vista de tarjetas en celular)
    document.querySelectorAll('.table-wrap table').forEach((t) => {
        const heads = [...t.querySelectorAll('thead th')].map((h) => h.textContent.trim());
        t.querySelectorAll('tbody tr').forEach((tr) =>
            [...tr.children].forEach((td, i) => {
                if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || '');
            }),
        );
    });
}
new MutationObserver(etiquetarTablas).observe(document.getElementById('app') || document.body, { childList: true, subtree: true });
const loading = () => view('<p class="loading">Un momento…</p>');
const saludo = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
};
