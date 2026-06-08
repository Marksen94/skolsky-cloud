// ============================================================
// Supabase Edge Function — summer-cleanup
// Spustí sa automaticky cez pg_cron každý rok 1. septembra.
// Vymaže všetky súbory zo storage aj z databázy.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'class-files';

Deno.serve(async (req: Request) => {
  try {
    // ── Ochrana: akceptuj iba volanie s tajným tokenom ─────────────
    const authHeader = req.headers.get('Authorization');
    const expectedSecret = `Bearer ${Deno.env.get('CLEANUP_SECRET')}`;
    if (authHeader !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Supabase admin klient (service role) ───────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── 1. Načítaj všetky záznamy súborov z DB ─────────────────────
    const { data: files, error: fetchErr } = await supabase
      .from('files')
      .select('id, file_name');

    if (fetchErr) throw new Error('Chyba pri načítaní súborov: ' + fetchErr.message);

    const totalFiles = files?.length ?? 0;
    console.log(`[summer-cleanup] Nájdených ${totalFiles} súborov na vymazanie.`);

    if (totalFiles === 0) {
      return new Response(
        JSON.stringify({ success: true, deleted: 0, message: 'Žiadne súbory na vymazanie.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ── 2. Vymaž súbory zo Supabase Storage po dávkach 100 ─────────
    const fileNames = files!.map((f) => f.file_name);
    let storageDeleted = 0;
    const storageErrors: string[] = [];

    for (let i = 0; i < fileNames.length; i += 100) {
      const batch = fileNames.slice(i, i + 100);
      const { data: removed, error: storageErr } = await supabase.storage
        .from(BUCKET)
        .remove(batch);

      if (storageErr) {
        storageErrors.push(storageErr.message);
        console.error(`[summer-cleanup] Storage chyba (dávka ${i}):`, storageErr.message);
      } else {
        storageDeleted += removed?.length ?? 0;
      }
    }

    // ── 3. Vymaž všetky záznamy z tabuľky files ────────────────────
    const { error: dbFilesErr } = await supabase
      .from('files')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // zmaže všetky riadky

    if (dbFilesErr) throw new Error('Chyba pri mazaní DB záznamov (files): ' + dbFilesErr.message);

    // ── 4. Vymaž všetky priečinky z tabuľky folders ────────────────
    const { error: dbFoldersErr } = await supabase
      .from('folders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (dbFoldersErr) throw new Error('Chyba pri mazaní DB záznamov (folders): ' + dbFoldersErr.message);

    console.log(`[summer-cleanup] Hotovo. Storage: ${storageDeleted} súborov, DB: vyčistená.`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: totalFiles,
        storageDeleted,
        storageErrors: storageErrors.length > 0 ? storageErrors : undefined,
        message: `Úspešne vymazaných ${totalFiles} súborov a všetky priečinky.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[summer-cleanup] Kritická chyba:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
