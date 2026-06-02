import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, password, firstName, lastName, class: studentClass } = await request.json();

    if (!email || !password || !firstName || !lastName || !studentClass) {
      return NextResponse.json({ error: 'Všetky polia sú povinné.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Heslo musí mať aspoň 6 znakov.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vytvor auth používateľa
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Tento email je už zaregistrovaný.' }, { status: 400 });
      }
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Vytvor profil so statusom pending
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email,
      class: studentClass,
      status: 'pending',
      is_admin: false,
    });

    if (profileError) {
      // Rollback — vymaž auth používateľa ak sa nepodarilo vytvoriť profil
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Chyba pri vytváraní profilu: ' + profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Register error:', err);
    return NextResponse.json({ error: 'Nastala neočakávaná chyba pri registrácii.' }, { status: 500 });
  }
}
