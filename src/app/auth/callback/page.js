'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Overujem odkaz...');

  useEffect(() => {
    const code = searchParams.get('code');

    if (!code) {
      setStatus('Neplatný odkaz. Presmerovávam...');
      setTimeout(() => router.push('/forgot-password'), 2000);
      return;
    }

    supabase.auth.exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error || !data?.session) {
          console.error('Chyba pri výmene kódu za reláciu:', error);
          setStatus('Odkaz vypršal alebo je neplatný. Presmerovávam...');
          setTimeout(() => router.push('/forgot-password'), 2500);
          return;
        }

        // Vždy smeruj na update-password ak ide o reset hesla
        router.push('/update-password');
      })
      .catch((err) => {
        console.error('Unexpected error exchanging code for session:', err);
        setStatus('Nastala neočakávaná chyba. Presmerovávam...');
        setTimeout(() => router.push('/forgot-password'), 2500);
      });
  }, [router, searchParams]);

  return (
    <div className="text-center">
      <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-school-muted text-sm">{status}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center p-6">
      <Suspense fallback={
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-school-muted text-sm">Načítavam...</p>
        </div>
      }>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
