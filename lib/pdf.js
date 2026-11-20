'use strict';
// pdf.js: PDF hecho a mano (sin librerías). Un PDF es texto con objetos numerados, una tabla xref y un trailer.
// Generador de PDF mínimo, sin dependencias. Soporta texto (Helvetica), líneas y rectángulos.
// Coordenadas: origen arriba-izquierda (y crece hacia abajo) para escribir layouts de forma natural.

// Anchos de cada carácter de Helvetica (de 32 a 126) para poder centrar, alinear y cortar el texto
const W = [
    278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584,
    584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667,
    611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500,
    722, 500, 500, 500, 334, 260, 334, 584,
];

// Si el carácter no está en ASCII intenta quitarle la tilde (á -> a) para medir su ancho
function base(ch) {
    const c = ch.charCodeAt(0);
    if (c >= 32 && c <= 126) return ch;
    const n = ch.normalize('NFD')[0];
    return n && n.charCodeAt(0) >= 32 && n.charCodeAt(0) <= 126 ? n : '?';
}
function textWidth(str, size, bold) {
    let w = 0;
    for (const ch of String(str)) w += W[base(ch).charCodeAt(0) - 32] || 556;
    return (w / 1000) * size * (bold ? 1.06 : 1);
}
// El PDF usa codificación Latin-1; cambia comillas y guiones raros y lo que no se pueda lo pone como '?'
function toLatin1(str) {
    let out = '';
    for (const ch of String(str)) {
        const c = ch.charCodeAt(0);
        if (c === 8211 || c === 8212) out += '-';
        else if (c === 8220 || c === 8221) out += '"';
        else if (c === 8216 || c === 8217) out += "'";
        else if (c === 8226) out += '\x95';
        else if (c < 256) out += ch;
        else out += '?';
    }
    return out;
}
// Escapa paréntesis y barras, que tienen significado especial en las cadenas del PDF
const esc = (s) =>
    toLatin1(s)
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .replace(/[\r\n]+/g, ' ');
// Pasa un color hex (#RRGGBB) al formato 0-1 que usa el PDF
const rgb = (hex) => {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    return [0, 2, 4].map((i) => (parseInt(h.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
};
const FONTS = { regular: 'F1', bold: 'F2', italic: 'F3' };

// Cada método agrega instrucciones de dibujo a la página actual; toBuffer arma el archivo final
class Pdf {
    constructor(w = 595.28, h = 841.89) {
        this.w = w;
        this.h = h;
        this.pages = [];
        this.newPage();
    }
    newPage() {
        this.cur = [];
        this.pages.push(this.cur);
        return this;
    }
    _y(y) {
        return (this.h - y).toFixed(2);
    }
    rect(x, y, w, h, { fill, stroke, lineWidth = 1 } = {}) {
        let s = '';
        if (fill) s += `${rgb(fill)} rg `;
        if (stroke) s += `${rgb(stroke)} RG ${lineWidth} w `;
        s += `${x.toFixed(2)} ${(this.h - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re `;
        s += fill && stroke ? 'B' : fill ? 'f' : 'S';
        this.cur.push(s);
        return this;
    }
    line(x1, y1, x2, y2, { color = '#999999', lineWidth = 0.7 } = {}) {
        this.cur.push(`${rgb(color)} RG ${lineWidth} w ${x1.toFixed(2)} ${this._y(y1)} m ${x2.toFixed(2)} ${this._y(y2)} l S`);
        return this;
    }
    // Círculo dibujado con 4 curvas de Bézier (el PDF no tiene un comando de círculo)
    circle(cx, cy, r, { stroke, fill, lineWidth = 1 } = {}) {
        const k = 0.5523 * r;
        const X = cx,
            Y = this.h - cy;
        let s = '';
        if (fill) s += `${rgb(fill)} rg `;
        if (stroke) s += `${rgb(stroke)} RG ${lineWidth} w `;
        s += `${X + r} ${Y} m ${X + r} ${Y + k} ${X + k} ${Y + r} ${X} ${Y + r} c ${X - k} ${Y + r} ${X - r} ${Y + k} ${X - r} ${Y} c ${X - r} ${Y - k} ${X - k} ${Y - r} ${X} ${Y - r} c ${X + k} ${Y - r} ${X + r} ${Y - k} ${X + r} ${Y} c `;
        s += fill && stroke ? 'B' : fill ? 'f' : 'S';
        this.cur.push(s);
        return this;
    }
    // align: left | center | right (relativo a x y width)
    text(str, x, y, { size = 11, font = 'regular', color = '#222222', align = 'left', width = 0 } = {}) {
        str = String(str ?? '');
        const bold = font === 'bold';
        const tw = textWidth(str, size, bold);
        let px = x;
        if (align === 'center') px = x + (width - tw) / 2;
        else if (align === 'right') px = x + width - tw;
        this.cur.push(`BT ${rgb(color)} rg /${FONTS[font]} ${size} Tf ${px.toFixed(2)} ${this._y(y + size * 0.8)} Td (${esc(str)}) Tj ET`);
        return tw;
    }
    // Parte un texto en varias líneas según el ancho disponible
    wrap(str, width, size = 10, font = 'regular') {
        const words = String(str ?? '')
            .split(/\s+/)
            .filter(Boolean);
        const lines = [];
        let line = '';
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (textWidth(t, size, font === 'bold') <= width) line = t;
            else {
                if (line) lines.push(line);
                line = w;
            }
        }
        if (line) lines.push(line);
        return lines.length ? lines : [''];
    }
    // Escribe un párrafo y devuelve la nueva y
    paragraph(str, x, y, width, opts = {}) {
        const size = opts.size || 10;
        const lh = opts.lineHeight || size * 1.45;
        for (const l of this.wrap(str, width, size, opts.font)) {
            this.text(l, x, y, { ...opts, size });
            y += lh;
        }
        return y;
    }
    // Corta un texto muy largo y le pone '...' para que quepa en su celda
    truncate(str, width, size, bold) {
        str = String(str ?? '');
        if (textWidth(str, size, bold) <= width) return str;
        while (str.length > 1 && textWidth(str + '…', size, bold) > width) str = str.slice(0, -1);
        return str.trimEnd() + '...';
    }
    // Arma el documento: catálogo, páginas, fuentes, tabla de referencias (xref) y trailer
    toBuffer() {
        const objs = [];
        const add = (s) => {
            objs.push(s);
            return objs.length;
        };
        add('<< /Type /Catalog /Pages 2 0 R >>');
        add(''); // pages placeholder
        const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
        const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
        const f3 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>');
        const kids = [];
        for (const p of this.pages) {
            const content = toLatin1(p.join('\n'));
            const cid = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
            const pid = add(
                `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.w.toFixed(2)} ${this.h.toFixed(2)}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R /F3 ${f3} 0 R >> >> /Contents ${cid} 0 R >>`,
            );
            kids.push(`${pid} 0 R`);
        }
        objs[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${kids.length} >>`;
        let out = '%PDF-1.4\n';
        const offs = [];
        objs.forEach((o, i) => {
            offs.push(out.length);
            out += `${i + 1} 0 obj\n${o}\nendobj\n`;
        });
        const xref = out.length;
        out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
        for (const o of offs) out += String(o).padStart(10, '0') + ' 00000 n \n';
        out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
        return Buffer.from(out, 'latin1');
    }
}
module.exports = { Pdf, textWidth };
