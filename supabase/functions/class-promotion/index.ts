// ============================================================
// Supabase Edge Function — class-promotion
// Spustí sa automaticky cez pg_cron každý rok 1. septembra
// o 02:30 (po summer-cleanup o 02:00).
//
// Logika:
//   1.X → 2.X  (aktualizuje stĺpec class v profiles)
//   2.X → 3.X
//   3.X → 4.X
//   4.X → vymaže žiaka (profiles + auth)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Povolené prípony tried
const SUFFIXES = ['A', 'C', 'T', 'G', 'H', 'V'];

function nextClass(currentClass: string): string | null {
  const match = currentClass.match(/^(\d+)\.([A-Z]+)$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const suffix = match[2];
  if (year >= 4) return null;           // 4.X → vymazať
  return `${year + 1}.${suffix}`;       // napr. 1.A → 2.A
}

Deno.serve(async (req: Request) => {
  try {
    // ── Ochrana: tajný token ───────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    const expectedSecret = `Bearer ${Deno.env.get('CLEANUP_SECRET')}`;
    if (authHeader !== expectedSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── Supabase admin klient ──────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── 1. Načítaj všetkých žiakov (nie adminov) ──────────────────
    const { data: students, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, class, status')
      .eq('is_admin', false);

    if (fetchErr) throw new Error('Chyba pri načítaní žiakov: ' + fetchErr.message);

    const total = students?.length ?? 0;
    console.log(`[class-promotion] Spracovávam ${total} žiakov...`);

    const results = {
      promoted: [] as string[],
      deleted:  [] as string[],
      errors:   [] as string[],
    };

    for (const student of students ?? []) {
      const next = nextClass(student.class);
      const name = `${student.first_name} ${student.last_name} (${student.class})`;

      if (next === null) {
        // ── 4. ročník → vymaž žiaka ───────────────────────────────

        // Vymaž súbory žiaka zo storage
        const { data: userFiles } = await supabase
          .from('files')
          .select('file_name')
          .eq('uploaded_by', student.id);

        if (userFiles?.length) {
          const fileNames = userFiles.map((f: { file_name: string }) => f.file_name);
          for (let i = 0; i < fileNames.length; i += 100) {
            await supabase.storage.from('class-files').remove(fileNames.slice(i, i + 100));
          }
          await supabase.from('files').delete().eq('uploaded_by', student.id);
        }

        // Vymaž profil
        const { error: profileErr } = await supabase
          .from('profiles')
          .delete()
          .eq('id', student.id);

        if (profileErr) {
          results.errors.push(`${name}: ${profileErr.message}`);
          continue;
        }

        // Vymaž auth záznam
        const { error: authErr } = await supabase.auth.admin.deleteUser(student.id);
        if (authErr) {
          results.errors.push(`${name} (auth): ${authErr.message}`);
          continue;
        }

        results.deleted.push(name);
        console.log(`[class-promotion] Vymazaný: ${name}`);

      } else {
        // ── 1./2./3. ročník → posuň do vyššej triedy ──────────────
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ class: next })
          .eq('id', student.id);

        if (updateErr) {
          results.errors.push(`${name} → ${next}: ${updateErr.message}`);
          continue;
        }

        results.promoted.push(`${student.class} → ${next} (${student.first_name} ${student.last_name})`);
        console.log(`[class-promotion] Presunutý: ${name} → ${next}`);
      }
    }

    console.log(`[class-promotion] Hotovo. Presunutých: ${results.promoted.length}, Vymazaných: ${results.deleted.length}, Chýb: ${results.errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total,
          promoted: results.promoted.length,
          deleted:  results.deleted.length,
          errors:   results.errors.length,
        },
        details: results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[class-promotion] Kritická chyba:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
