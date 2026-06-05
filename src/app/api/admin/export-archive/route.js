import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import archiver from 'archiver';
import { Readable } from 'stream';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function GET(request) {
  // Overenie admina cez Bearer token
  const token = request.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.json({ error: 'Neoprávnený prístup.' }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: 'Neplatný token.' }, { status: 401 });

  const { data: prof } = await supabaseAdmin.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!prof?.is_admin) return NextResponse.json({ error: 'Prístup zamietnutý.' }, { status: 403 });

  // Načítaj všetky záznamy súborov z DB
  const { data: files, error: filesErr } = await supabaseAdmin.from('files').select('*');
  if (filesErr) return NextResponse.json({ error: 'Chyba pri načítaní súborov.' }, { status: 500 });
  if (!files?.length) return NextResponse.json({ error: 'Žiadne súbory na export.' }, { status: 404 });

  // Vytvor ZIP stream
  const archive = archiver('zip', { zlib: { level: 6 } });

  const chunks = [];
  archive.on('data', chunk => chunks.push(chunk));

  const archiveFinished = new Promise((resolve, reject) => {
    archive.on('end', resolve);
    archive.on('error', reject);
  });

  // Pridaj každý súbor do ZIPu
  for (const file of files) {
    try {
      const { data: blob, error: dlErr } = await supabaseAdmin.storage
        .from('class-files')
        .download(file.file_name);

      if (dlErr || !blob) continue;

      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Adresárová štruktúra: trieda/nazov_suboru
      const dir = file.class || 'neznama-trieda';
      const safeName = file.original_name.replace(/[/\\:*?"<>|]/g, '_');
      archive.append(buffer, { name: `${dir}/${safeName}` });
    } catch {
      // Preskočí nedostupný súbor
    }
  }

  archive.finalize();
  await archiveFinished;

  const zipBuffer = Buffer.concat(chunks);
  const date = new Date().toISOString().split('T')[0];

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="school-cloud-export-${date}.zip"`,
      'Content-Length': zipBuffer.length.toString(),
    },
  });
}
