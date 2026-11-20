'use strict';
// Generador mínimo de ZIP (sin compresión, solo módulos nativos). Suficiente para agrupar PDFs.
const zlib = require('zlib');

let TABLE = null;
// CRC32 que pide el formato ZIP para validar cada archivo (usa el de zlib si existe, si no lo calcula con una tabla).
function crc32(buf) {
    if (typeof zlib.crc32 === 'function') return zlib.crc32(buf) >>> 0;
    if (!TABLE) {
        TABLE = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            TABLE[n] = c >>> 0;
        }
    }
    let c = 0xffffffff;
    for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

// Arma el ZIP a mano: por cada archivo va una cabecera local + datos, y al final el directorio central.
function buildZip(files) {
    // files: [{ name, data: Buffer }]
    const locals = [];
    const centrals = [];
    let offset = 0;
    const now = new Date();
    const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
    const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    for (const f of files) {
        const name = Buffer.from(f.name, 'utf8');
        const crc = crc32(f.data);
        const size = f.data.length;
        const lh = Buffer.alloc(30);
        lh.writeUInt32LE(0x04034b50, 0);
        lh.writeUInt16LE(20, 4);
        lh.writeUInt16LE(0x0800, 6);
        lh.writeUInt16LE(0, 8);
        lh.writeUInt16LE(time, 10);
        lh.writeUInt16LE(date, 12);
        lh.writeUInt32LE(crc, 14);
        lh.writeUInt32LE(size, 18);
        lh.writeUInt32LE(size, 22);
        lh.writeUInt16LE(name.length, 26);
        lh.writeUInt16LE(0, 28);
        locals.push(lh, name, f.data);
        const ch = Buffer.alloc(46);
        ch.writeUInt32LE(0x02014b50, 0);
        ch.writeUInt16LE(20, 4);
        ch.writeUInt16LE(20, 6);
        ch.writeUInt16LE(0x0800, 8);
        ch.writeUInt16LE(0, 10);
        ch.writeUInt16LE(time, 12);
        ch.writeUInt16LE(date, 14);
        ch.writeUInt32LE(crc, 16);
        ch.writeUInt32LE(size, 20);
        ch.writeUInt32LE(size, 24);
        ch.writeUInt16LE(name.length, 28);
        ch.writeUInt32LE(offset, 42);
        centrals.push(ch, name);
        offset += lh.length + name.length + size;
    }
    // Directorio central y registro final: así los programas saben qué archivos hay y dónde empiezan
    const cd = Buffer.concat(centrals);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(cd.length, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...locals, cd, end]);
}
module.exports = { buildZip };
