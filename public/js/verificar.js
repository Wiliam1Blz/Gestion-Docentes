// verificar.js - página pública para comprobar una constancia por su código
(function () {
    // escapa texto para evitar HTML inyectado
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    // nombres de los meses para mostrar la fecha
    const M = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    // convierte 2026-03-09 a '9 de marzo de 2026'
    const fl = (iso) => {
        const [y, m, d] = iso.split('-').map(Number);
        return `${d} de ${M[m - 1]} de ${y}`;
    };
    const input = document.getElementById('c'),
        res = document.getElementById('res');
    // consulta al servidor si el código de la constancia existe y muestra el resultado
    async function verificar(codigo) {
        res.innerHTML = '<p class="muted">Buscando…</p>';
        try {
            const r = await fetch('/api/verificar/' + encodeURIComponent(codigo.trim()));
            const d = await r.json();
            if (!r.ok) throw new Error(d.error);
            res.innerHTML = `<div class="note ok"><b>✓ Constancia auténtica</b></div>
        <div class="kv"><div><span>Docente</span>${esc(d.docente)}</div><div><span>Capacitación</span>${esc(d.titulo)}</div>
        <div><span>Duración</span>${d.horas} horas académicas</div><div><span>Realizada</span>${fl(d.fecha_inicio)} al ${fl(d.fecha_fin)}</div>
        <div><span>Emitida el</span>${fl(d.constancia_fecha)}</div><div><span>Código</span>${esc(d.constancia_codigo)}</div></div>`;
        } catch (e) {
            res.innerHTML = `<div class="note"><b>No pudimos validarla.</b> ${esc(e.message)}</div>`;
        }
    }
    // al enviar el formulario verifica el código escrito
    document.getElementById('f').addEventListener('submit', (e) => {
        e.preventDefault();
        verificar(input.value);
    });
    // si el código viene en la URL (?c=...) se verifica solo
    const q = new URLSearchParams(location.search).get('c');
    if (q) {
        input.value = q;
        verificar(q);
    }
})();
