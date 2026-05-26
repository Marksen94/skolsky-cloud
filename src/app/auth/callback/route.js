import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Výmena jednorazového kódu za reláciu (session)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      const { access_token, refresh_token } = data.session;
      const redirectUrl = new URL(next, origin);
      
      // Presmerovanie na update-password s hash fragmentom, ktorý klientská Supabase knižnica
      // automaticky prečíta a prihlási používateľa (detectSessionInUrl: true).
      redirectUrl.hash = `access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`;
      
      return NextResponse.redirect(redirectUrl);
    }
  }

  // V prípade chyby alebo chýbajúceho kódu presmerujeme na domovskú stránku
  return NextResponse.redirect(new URL('/', origin));
}
