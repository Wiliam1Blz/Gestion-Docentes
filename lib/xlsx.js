'use strict';
// Escritor mínimo de .xlsx (Open XML) sin dependencias. Una o varias hojas, cabecera con estilo, anchos automáticos.
const zlib = require('zlib');

// Escapa caracteres especiales para que el XML no se rompa
const xmlEsc = (s) =>
    String(s)
        .replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c])
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
// Convierte 0 -> A, 1 -> B, ... 26 -> AA (nombre de columna de Excel)
function colName(i) {
    let s = '';
    i++;
    while (i > 0) {
        const m = (i - 1) % 26;
        s = String.fromCharCode(65 + m) + s;
        i = Math.floor((i - 1) / 26);
    }
    return s;
}

// Genera el XML de una hoja: calcula anchos de columna, congela la primera fila y pone filtro
function sheetXml(rows) {
    const widths = [];
    rows.forEach((r) =>
        r.forEach((v, i) => {
            const l = String(v ?? '').length;
            widths[i] = Math.min(60, Math.max(widths[i] || 8, l + 2));
        }),
    );
    let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">';
    x +=
        '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
    x += '<cols>' + widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols><sheetData>';
    rows.forEach((r, ri) => {
        x += `<row r="${ri + 1}">`;
        r.forEach((v, ci) => {
            const ref = colName(ci) + (ri + 1);
            const style = ri === 0 ? ' s="1"' : '';
            if (v === null || v === undefined || v === '') x += `<c r="${ref}"${style}/>`;
            else if (typeof v === 'number' && Number.isFinite(v)) x += `<c r="${ref}"${style}><v>${v}</v></c>`;
            else x += `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
        });
        x += '</row>';
    });
    x += `</sheetData><autoFilter ref="A1:${colName(Math.max(0, (rows[0] || []).length - 1))}${Math.max(1, rows.length)}"/></worksheet>`;
    return x;
}

// Un .xlsx es un ZIP con archivos XML adentro; este ZIP sí comprime (deflate) los datos
function zip(files) {
    const locals = [];
    const centrals = [];
    let offset = 0;
    const date = 0x5a21,
        time = 0x0000; // fecha fija
    for (const f of files) {
        const name = Buffer.from(f.name);
        const raw = Buffer.from(f.data);
        const comp = zlib.deflateRawSync(raw);
        const crc = zlib.crc32(raw) >>> 0;
        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0);
        lh.writeUInt16LE(20, 4);
        lh.writeUInt16LE(0x0800, 6);
        lh.writeUInt16LE(8, 8);
        lh.writeUInt16LE(time, 10);
        lh.writeUInt16LE(date, 12);
        lh.writeUInt32LE(crc, 14);
        lh.writeUInt32LE(comp.length, 18);
        lh.writeUInt32LE(raw.length, 22);
        lh.writeUInt16LE(name.length, 26);
        lh.writeUInt16LE(0, 28);
        locals.push(lh, name, comp);
        const ch = Buffer.alloc(46);
        ch.writeUInt32LE(0x02014b50, 0);
        ch.writeUInt16LE(20, 4);
        ch.writeUInt16LE(20, 6);
        ch.writeUInt16LE(0x0800, 8);
        ch.writeUInt16LE(8, 10);
        ch.writeUInt16LE(time, 12);
        ch.writeUInt16LE(date, 14);
        ch.writeUInt32LE(crc, 16);
        ch.writeUInt32LE(comp.length, 20);
        ch.writeUInt32LE(raw.length, 24);
        ch.writeUInt16LE(name.length, 28);
        ch.writeUInt32LE(offset, 42);
        centrals.push(ch, name);
        offset += lh.length + name.length + comp.length;
    }
    const cd = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(cd.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, cd, end]);
}

// sheets: [{ name, rows: [[cabeceras], [fila], ...] }]
// Junta todas las partes obligatorias del xlsx (tipos, relaciones, libro, estilos y hojas) y las empaqueta
function buildXlsx(sheets) {
    const files = [];
    files.push({
        name: '[Content_Types].xml',
        data:
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            sheets
                .map(
                    (_, i) =>
                        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
                )
                .join('') +
            '</Types>',
    });
    files.push({
        name: '_rels/.rels',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    });
    files.push({
        name: 'xl/workbook.xml',
        data:
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
            sheets.map((s, i) => `<sheet name="${xmlEsc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
            '</sheets></workbook>',
    });
    files.push({
        name: 'xl/_rels/workbook.xml.rels',
        data:
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            sheets
                .map(
                    (_, i) =>
                        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
                )
                .join('') +
            `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    });
    files.push({
        name: 'xl/styles.xml',
        data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123B7A"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
    });
    sheets.forEach((s, i) => files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, data: sheetXml(s.rows) }));
    return zip(files);
}
module.exports = { buildXlsx };
