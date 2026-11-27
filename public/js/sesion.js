// sesion.js - parte del frontend de Gestión Docente CERTUS: sesión (login, menú lateral) y enrutador de vistas.
// Los archivos se cargan en orden desde index.html (base, sesion, vistas..., acciones) y comparten las mismas funciones.
'use strict';
/* ============================================================ Sesión y estructura */
// cierra sesión y vuelve al login
function logout() {
    S.token = null;
    S.user = null;
    saveSession();
    location.hash = '';
    renderApp();
}
// pantalla de inicio de sesión
function renderLogin() {
    const recordado = (() => {
        try { return localStorage.getItem('em') || ''; } catch { return ''; }
    })();
    $('#app').innerHTML = `<div class="auth"><i class="d d-tl"></i><i class="d d-dots"></i><i class="d d-bl"></i><i class="d d-r1"></i><i class="d d-r2"></i><svg class="d d-book" viewBox="0 0 190 150" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M95 38 55 20 15 38l40 18 40-18Z" transform="translate(40 0)"/><path d="M75 50v14c0 8 12 14 20 14s20-6 20-14V50" transform="translate(0 0)"/><path d="M10 70c28-6 52-2 85 14 33-16 57-20 85-14v70c-28-6-52-2-85 14-33-16-57-20-85-14V70Z"/><path d="M95 84v70M28 92c18-2 34 1 54 10M28 108c18-2 34 1 54 10M28 124c18-2 34 1 54 10M162 92c-18-2-34 1-54 10M162 108c-18-2-34 1-54 10M162 124c-18-2-34 1-54 10"/></svg><div class="auth-wrap"><section class="auth-art"><svg class="auth-logo" viewBox="0 0 345 92" role="img" aria-label="CERTUS"><rect width="345" height="92" rx="46" fill="#fff"/><rect x="52" y="9" width="284" height="74" rx="37" fill="#0b2b84"/><text x="194" y="64" text-anchor="middle" font-family="Poppins,Montserrat,Arial,sans-serif" font-weight="700" font-size="50" letter-spacing="3" fill="#fff">CERTUS</text></svg>
<h1><span>Portal de</span><span class="acc">Desarrollo</span><span>Docente</span></h1><div class="barra"></div></section>
<section class="auth-form"><form class="auth-box" id="lf" novalidate><h2>Bienvenido de vuelta</h2><p class="sub">Ingresa con tu cuenta institucional</p>
<div class="field"><label for="em">Correo institucional</label><div class="input-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg><input id="em" name="username" type="email" placeholder="Correo institucional" autocomplete="username" value="${esc(recordado)}" required></div></div>
<div class="field"><label for="pw">Contraseña</label><div class="input-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg><input id="pw" name="password" type="password" placeholder="Contraseña" autocomplete="current-password" required><button class="ojo" type="button" data-act="ver-clave" aria-label="Mostrar u ocultar contraseña"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button></div></div>
<div class="auth-opts"><label><input id="rec" type="checkbox"${recordado ? ' checked' : ''}> Recordar mi sesión</label><a href="#" data-act="olvido">¿Olvidaste tu contraseña?</a></div>
<div id="lerr" aria-live="polite"></div><button class="btn btn-ingresar" type="submit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/></svg> Ingresar</button>
<div class="demo-sep"><i></i></div>
<div class="demo">
  <button type="button" class="btn sm" data-rol="admin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></svg> Gestión Docente</button><button type="button" class="btn sm" data-rol="supervisor"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.4 8 8 9 4.6-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg> Supervisión</button><button type="button" class="btn sm" data-rol="docente"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg> Docente</button></div>
<p class="auth-foot">¿No tienes una cuenta? <a href="#" data-act="registro">Regístrate como docente</a></p>
<p class="auth-foot"><a href="/informe.html">Ver el plan del proyecto (Evidencia 1)</a></p></form></section></div></div>`;
    $('#lf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('button[type=submit]', e.target);
        btn.disabled = true;
        try {
            const r = await api('/api/auth/login', { method: 'POST', body: { email: $('#em').value, password: $('#pw').value } });
            try {
                $('#rec').checked ? localStorage.setItem('em', $('#em').value) : localStorage.removeItem('em');
            } catch {}
            S.token = r.token;
            S.user = r.user;
            saveSession();
            location.hash = '#/inicio';
            renderApp();
        } catch (err) {
            $('#lerr').innerHTML = `<div class="form-error" role="alert">${esc(err.message)}</div>`;
            btn.disabled = false;
        }
    });
}

// pantalla de registro: solo para docentes con correo @certus.edu.pe
const SEDES = ['Lima Centro', 'Lima Norte', 'Arequipa', 'Trujillo', 'Piura'];
const PROGRAMAS = [
    'Diseño y Desarrollo de Software',
    'Administración de Sistemas para la Transformación Digital',
    'Administración de Empresas',
    'Contabilidad',
    'Marketing Digital',
    'Enfermería Técnica',
];
function renderRegistro() {
    const opts = (a) => `<option value="">Selecciona…</option>` + a.map((x) => `<option>${esc(x)}</option>`).join('');
    $('.auth-form').innerHTML = `<form class="auth-box auth-reg" id="rf" novalidate><h2>Registro docente</h2><p class="sub">Solo para docentes con correo @certus.edu.pe</p>
<div class="reg-grid">
<div class="field"><label for="r-nom">Nombres</label><div class="input-ico plano"><input id="r-nom" placeholder="Nombres" autocomplete="given-name" maxlength="80" required></div></div>
<div class="field"><label for="r-ape">Apellidos</label><div class="input-ico plano"><input id="r-ape" placeholder="Apellidos" autocomplete="family-name" maxlength="80" required></div></div>
<div class="field"><label for="r-dni">DNI</label><div class="input-ico plano"><input id="r-dni" placeholder="DNI (8 dígitos)" inputmode="numeric" maxlength="8" required></div></div>
<div class="field"><label for="r-sede">Sede</label><div class="input-ico plano"><select id="r-sede" required>${opts(SEDES)}</select></div></div>
<div class="field full"><label for="r-prog">Programa</label><div class="input-ico plano"><select id="r-prog" required>${opts(PROGRAMAS)}</select></div></div>
<div class="field full"><label for="r-em">Correo institucional</label><div class="input-ico plano"><input id="r-em" type="email" placeholder="nombre.apellido@certus.edu.pe" autocomplete="off" required></div></div>
<div class="field"><label for="r-pw">Contraseña</label><div class="input-ico plano"><input id="r-pw" type="password" placeholder="Contraseña (8+ con letras y números)" autocomplete="new-password" required></div></div>
<div class="field"><label for="r-pw2">Repetir contraseña</label><div class="input-ico plano"><input id="r-pw2" type="password" placeholder="Repite la contraseña" autocomplete="new-password" required></div></div>
</div>
<div id="rerr" aria-live="polite"></div><button class="btn btn-ingresar" type="submit">Crear mi cuenta</button>
<p class="auth-foot">¿Ya tienes cuenta? <a href="#" data-act="volver-login">Volver a ingresar</a></p></form>`;
    $('#rf').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('button[type=submit]', e.target);
        const err = (m) => ($('#rerr').innerHTML = `<div class="form-error" role="alert">${esc(m)}</div>`);
        const em = $('#r-em').value.trim().toLowerCase();
        if (!/^[a-z0-9._-]+@certus\.edu\.pe$/.test(em)) return err('Usa tu correo institucional: debe terminar en @certus.edu.pe.');
        if ($('#r-pw').value !== $('#r-pw2').value) return err('Las contraseñas no coinciden.');
        btn.disabled = true;
        try {
            const r = await api('/api/auth/registro', {
                method: 'POST',
                body: {
                    nombres: $('#r-nom').value,
                    apellidos: $('#r-ape').value,
                    dni: $('#r-dni').value,
                    sede: $('#r-sede').value,
                    programa: $('#r-prog').value,
                    email: em,
                    password: $('#r-pw').value,
                    password2: $('#r-pw2').value,
                },
            });
            S.token = r.token;
            S.user = r.user;
            saveSession();
            location.hash = '#/inicio';
            renderApp();
            toast('¡Cuenta creada! Bienvenido(a).', 'ok');
        } catch (x) {
            err(x.message);
            btn.disabled = false;
        }
    });
}
// opciones del menú lateral según el rol
function navItems() {
    const u = S.user;
    if (u.rol === 'docente')
        return [
            ['inicio', 'Mi resumen', 'home', '#/inicio'],
            ['docentes', 'Mi ficha', 'user', `#/docentes/${u.docente_id}`],
            ['capacitaciones', 'Capacitaciones', 'book', '#/capacitaciones'],
        ];
    const base = [
        ['inicio', 'Inicio', 'home', '#/inicio'],
        ['docentes', 'Docentes', 'users', '#/docentes'],
        ['capacitaciones', 'Capacitaciones', 'book', '#/capacitaciones'],
        ['monitoreo', 'Monitoreo', 'pulse', '#/monitoreo'],
        ['reportes', 'Reportes', 'file', '#/reportes'],
    ];
    if (u.rol === 'admin') base.push(['actividad', 'Actividad', 'clock', '#/actividad']);
    return base;
}
const ROLES = { admin: 'Gestión Docente', supervisor: 'Supervisión académica', docente: 'Docente' };
// dibuja el menú lateral y la zona principal
function renderApp() {
    if (!S.token || !S.user) return renderLogin();
    $('#app').innerHTML =
        `<div class="shell"><aside class="side" id="side"><div class="brand"><img class="brand-logo" src="/img/logo-certus.png" alt="CERTUS"><div><b>CERTUS</b><span>Gestión Docente</span></div></div>
<div class="topbar"><button data-act="menu" aria-label="Menú">☰ Menú</button></div><nav class="nav" id="nav" aria-label="Principal"></nav>
<div class="me"><b>${esc(S.user.nombre)}</b><div class="role">${ROLES[S.user.rol]}</div><button data-act="clave">Cambiar contraseña</button><button data-act="salir">Cerrar sesión</button></div></aside>
<main class="main" id="view" tabindex="-1"></main></div>`;
    render();
}
// marca la opción actual del menú
function pintarNav(seccion) {
    $('#nav').innerHTML = navItems()
        .map(([k, l, i, h]) => `<a href="${h}" ${k === seccion ? 'aria-current="page"' : ''}>${ico(i)}${l}</a>`)
        .join('');
    $('#side').classList.remove('open');
}

/* ============================================================ Enrutador */
// enrutador: según el # de la URL muestra una vista u otra
async function render() {
    if (!S.user) return renderLogin();
    const [sec = 'inicio', a, b] = location.hash.replace(/^#\/?/, '').split('/');
    const staffOnly = ['monitoreo', 'reportes'];
    let s = sec || 'inicio';
    if (!isStaff() && (staffOnly.includes(s) || s === 'actividad' || (s === 'docentes' && Number(a) !== S.user.docente_id))) {
        location.hash = '#/inicio';
        return;
    }
    if (s === 'actividad' && !isAdmin()) {
        location.hash = '#/inicio';
        return;
    }
    pintarNav(s);
    loading();
    try {
        if (s === 'inicio') await vInicio();
        else if (s === 'docentes') await (a ? vFicha(Number(a), b || 'resumen') : vDocentes());
        else if (s === 'capacitaciones') await (a ? vCapacitacion(Number(a)) : vCapacitaciones());
        else if (s === 'monitoreo') await vMonitoreo();
        else if (s === 'reportes') await vReportes();
        else if (s === 'actividad') await vActividad();
        else view(empty('No encontramos esa página', 'Usa el menú para volver a donde estabas.'));
    } catch (e) {
        view(`<div class="card">${empty('Algo no salió como esperábamos', e.message)}</div>`);
    }
}
