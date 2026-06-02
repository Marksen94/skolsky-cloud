import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId je povinný' }, { status: 400 });
    }

    // Service role klient — má plný prístup k auth.users a DB
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // ── Overenie volajúceho: musí byť prihlásený admin ──────────────────────
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Chýba autorizačný token.' }, { status: 401 });
    }
    const callerToken = authHeader.slice(7);

    // Overíme token cez Supabase — vráti session volajúceho
    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(callerToken);
    if (callerErr || !caller) {
      return NextResponse.json({ error: 'Neplatný token.' }, { status: 401 });
    }

    // Skontrolujeme, či má volajúci is_admin = true v profiles
    const { data: callerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', caller.id)
      .single();

    if (profileErr || !callerProfile?.is_admin) {
      return NextResponse.json({ error: 'Prístup zamietnutý. Nie si správca.' }, { status: 403 });
    }

    // Zabrán správcovi vymazať samého seba
    if (caller.id === userId) {
      return NextResponse.json({ error: 'Nemôžeš vymazať vlastný účet.' }, { status: 400 });
    }
    // ────────────────────────────────────────────────────────────────────────

    // Najprv vymaž súbory žiaka zo storage
    const { data: userFiles, error: userFilesErr } = await supabaseAdmin
      .from('files')
      .select('file_name')
      .eq('uploaded_by', userId);
    if (userFilesErr) throw userFilesErr;

    if (userFiles?.length) {
      const { error: storageErr } = await supabaseAdmin.storage
        .from('class-files')
        .remove(userFiles.map(f => f.file_name));
      if (storageErr) throw storageErr;

      const { error: deleteFilesErr } = await supabaseAdmin.from('files').delete().eq('uploaded_by', userId);
      if (deleteFilesErr) throw deleteFilesErr;
    }

    // Vymaž profil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Vymaž aj auth záznam — teraz môže použiť rovnaký email znova
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
