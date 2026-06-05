'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Overujem odkaz...');

  useEffect(() => {
    const timerRef = { id: null };
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/update-password';

    if (!code) {
      setStatus('Neplatný odkaz. Presmerovávam...');
      timerRef.id = setTimeout(() => router.push('/forgot-password'), 2000);
      return () => { clearTimeout(timerRef.id); };
    }

    const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/update-password';

    supabase.auth.exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error || !data?.session) {
          console.error('Chyba pri výmene kódu za reláciu:', error);
          setStatus('Odkaz vypršal alebo je neplatný. Presmerovávam...');
          timerRef.id = setTimeout(() => router.push('/forgot-password'), 2500);
          return;
        }
        router.push(safeNext);
      })
      .catch((err) => {
        console.error('Unexpected error exchanging code for session:', err);
        setStatus('Nastala neočakávaná chyba. Presmerovávam...');
        timerRef.id = setTimeout(() => router.push('/forgot-password'), 2500);
      });

    return () => { clearTimeout(timerRef.id); };
  }, [router, searchParams]);

  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
        style={{ borderWidth: '4px', borderStyle: 'solid', borderColor: 'var(--accent-link)', borderTopColor: 'transparent' }} />
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{status}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <Suspense fallback={
        <div className="text-center">
          <div className="w-12 h-12 rounded-full animate-spin mx-auto mb-4"
            style={{ borderWidth: '4px', borderStyle: 'solid', borderColor: 'var(--accent-link)', borderTopColor: 'transparent' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Načítavam...</p>
        </div>
      }>
        <AuthCallbackContent />
      </Suspense>
    </div>
  );
}
