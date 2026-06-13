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
    if (password.length > 72) {
      return NextResponse.json({ error: 'Heslo môže mať maximálne 72 znakov.' }, { status: 400 });
    }

    const VALID_CLASSES = [
      '1.A', '1.C', '1.T', '1.G', '1.H', '1.V',
      '2.A', '2.C', '2.T', '2.G', '2.H', '2.V',
      '3.A', '3.C', '3.T', '3.G', '3.H', '3.V',
      '4.A', '4.C', '4.T', '4.G', '4.H', '4.V',
    ];
    if (!VALID_CLASSES.includes(studentClass)) {
      return NextResponse.json({ error: 'Neplatná trieda.' }, { status: 400 });
    }

    const cleanEmail = email.trim().slice(0, 254).toLowerCase();
    const cleanFirst = firstName.trim().slice(0, 50);
    const cleanLast = lastName.trim().slice(0, 50);
    if (!cleanEmail || !cleanFirst || !cleanLast) {
      return NextResponse.json({ error: 'Meno a priezvisko sú povinné.' }, { status: 400 });
    }
    // Základná validácia emailu
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Neplatný formát emailu.' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vytvor auth používateľa
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
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
      first_name: cleanFirst,
      last_name: cleanLast,
      email: cleanEmail,
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
