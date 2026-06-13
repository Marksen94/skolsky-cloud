import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  // Vytvor klienta vočí každej request — bezpečnejšie, bez memory leaku
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Neoprávnený prístup.' }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Neplatný token.' }, { status: 401 });

  const { data: prof } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) return NextResponse.json({ error: 'Prístup zamietnutý.' }, { status: 403 });

  const { data: files, error: filesErr } = await supabaseAdmin.from('files').select('*');
  if (filesErr) return NextResponse.json({ error: 'Chyba pri načítaní súborov.' }, { status: 500 });
  if (!files?.length) return NextResponse.json({ error: 'Žiadne súbory na export.' }, { status: 404 });

  // Manuálny ZIP bez externých knižníc
  const zipParts = [];

  function dosDate(d) {
    return ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  }
  function dosTime(d) {
    return (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  }

  function crc32(buf) {
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
      }
      return t;
    })());
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function writeUint16LE(n) {
    const b = new Uint8Array(2);
    b[0] = n & 0xFF; b[1] = (n >> 8) & 0xFF;
    return b;
  }
  function writeUint32LE(n) {
    const b = new Uint8Array(4);
    b[0] = n & 0xFF; b[1] = (n >> 8) & 0xFF; b[2] = (n >> 16) & 0xFF; b[3] = (n >> 24) & 0xFF;
    return b;
  }

  const centralDir = [];
  let offset = 0;
  const now = new Date();
  const modDate = dosDate(now);
  const modTime = dosTime(now);

  // ZIP bez ZIP64 podporuje len offsety/veľkosti do 4 GB (Uint32). Po prekročení
  // limitu ďalšie súbory vynecháme, aby archív nebol skorumpovaný.
  const ZIP32_LIMIT = 0xFFFFFFFF;
  let zipLimitReached = false;
  let skippedDueToLimit = 0;

  for (const file of files) {
    if (zipLimitReached) { skippedDueToLimit++; continue; }
    try {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage.from('class-files').download(file.file_name);
      if (dlErr || !blob) continue;

      const arrayBuffer = await blob.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      // Ak by tento súbor posunul offset za 4 GB hranicu, archív (bez ZIP64)
      // by sa poškodil — preskočíme zostávajúce súbory.
      if (offset + 30 + fileData.length > ZIP32_LIMIT) {
        zipLimitReached = true;
        skippedDueToLimit++;
        continue;
      }

      const dir = (file.class || 'neznama-trieda').replace(/[\/\\:*?"<>|]/g, '_');
      const safeName = (file.original_name || 'subor').replace(/[\/\\:*?"<>|]/g, '_');
      const uniquePrefix = file.id ? file.id.slice(0, 8) + '_' : '';
      const entryName = `${dir}/${uniquePrefix}${safeName}`;
      const nameBytes = new TextEncoder().encode(entryName);

      const crc = crc32(fileData);
      const size = fileData.length;

      // Local file header
      const localHeader = new Uint8Array(30 + nameBytes.length);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true);  // signature
      lv.setUint16(4, 20, true);           // version needed
      lv.setUint16(6, 0, true);            // flags
      lv.setUint16(8, 0, true);            // compression: stored
      lv.setUint16(10, modTime, true);
      lv.setUint16(12, modDate, true);
      lv.setUint32(14, crc, true);
      lv.setUint32(18, size, true);        // compressed size
      lv.setUint32(22, size, true);        // uncompressed size
      lv.setUint16(26, nameBytes.length, true);
      lv.setUint16(28, 0, true);           // extra field length
      localHeader.set(nameBytes, 30);

      // Central dir entry
      const cdEntry = new Uint8Array(46 + nameBytes.length);
      const cv = new DataView(cdEntry.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, modTime, true);
      cv.setUint16(14, modDate, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, size, true);
      cv.setUint32(24, size, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      cdEntry.set(nameBytes, 46);

      zipParts.push(localHeader);
      zipParts.push(fileData);
      centralDir.push(cdEntry);

      offset += localHeader.length + fileData.length;
    } catch {
      continue;
    }
  }

  // End of central directory
  const cdSize = centralDir.reduce((s, e) => s + e.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, centralDir.length, true);
  ev.setUint16(10, centralDir.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const allParts = [...zipParts, ...centralDir, eocd];
  const totalSize = allParts.reduce((s, p) => s + p.length, 0);
  const zipBuffer = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of allParts) { zipBuffer.set(part, pos); pos += part.length; }

  const date = new Date().toISOString().split('T')[0];

  const headers = {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="school-cloud-export-${date}.zip"`,
    'Content-Length': zipBuffer.length.toString(),
  };
  if (skippedDueToLimit > 0) {
    // Upozornenie pre klienta, že archív presiahol 4 GB limit (ZIP bez ZIP64)
    // a niektoré súbory neboli zahrnuté.
    headers['X-Export-Skipped-Files'] = String(skippedDueToLimit);
    headers['X-Export-Warning'] = 'size-limit-4gb-exceeded';
  }

  return new NextResponse(zipBuffer, {
    status: 200,
    headers,
  });
}
