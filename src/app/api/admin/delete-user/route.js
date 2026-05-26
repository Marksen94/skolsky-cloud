import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId je povinný' }, { status: 400 });
    }

    // Service role kľúč — môže vymazať auth.users
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Najprv vymaž súbory žiaka zo storage
    const { data: userFiles } = await supabaseAdmin
      .from('files')
      .select('file_name')
      .eq('uploaded_by', userId);

    if (userFiles?.length) {
      await supabaseAdmin.storage
        .from('class-files')
        .remove(userFiles.map(f => f.file_name));
      await supabaseAdmin.from('files').delete().eq('uploaded_by', userId);
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
