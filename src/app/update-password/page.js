'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    let timeout;
    const markReady = () => {
      readyRef.current = true;
      setReady(true);
      if (timeout) clearTimeout(timeout);
    };

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) markReady();
      } catch (err) {
        console.error('Error getting session:', err);
      }
    };

    // Use ref in the callback to avoid stale closure — state won't be visible here
    timeout = setTimeout(() => {
      if (!readyRef.current) router.replace('/forgot-password');
    }, 10000);

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        markReady();
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeout) clearTimeout(timeout);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov.');
      return;
    }
    if (password !== confirm) {
      setError('Heslá sa nezhodujú.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError('Chyba pri aktualizácii hesla: ' + updateError.message);
        setLoading(false);
        return;
      }

      await supabase.auth.signOut();
      setSuccess(true);
      redirectTimerRef.current = setTimeout(() => router.push('/'), 3000);
    } catch (err) {
      console.error(err);
      setError('Nastala neočakávaná chyba pri aktualizácii hesla.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md p-1.5 mx-auto mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Image src="/logo.png" alt="Logo" width={52} height={52} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Spojená škola Kollárova 17, Sečovce
          </h1>
        </div>

        <div className="card shadow-card">
          {success ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(5,150,105,0.15)' }}>
                <CheckCircle size={28} style={{ color: '#10b981' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
                Heslo bolo úspešne zmenené!
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>O 3 sekundy vás presmerujeme na prihlásenie...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
                  <KeyRound size={18} style={{ color: 'var(--accent-link)' }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
                    Nastavenie nového hesla
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Zadajte nové heslo pre váš účet</p>
                </div>
              </div>

              {!ready && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(180,100,0,0.1)', border: '1px solid rgba(180,100,0,0.25)', color: '#d97706' }}>
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  Načítavam reláciu, chvíľu počkajte...
                </div>
              )}

              {error && (
                <div className="px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Nové heslo</label>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} className="input-field pr-12"
                      placeholder="min. 6 znakov" value={password} onChange={e => setPassword(e.target.value)}
                      required disabled={!ready} />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Zopakujte nové heslo</label>
                  <input type={showPw ? 'text' : 'password'} className="input-field"
                    placeholder="zopakujte heslo" value={confirm} onChange={e => setConfirm(e.target.value)}
                    required disabled={!ready} />
                </div>

                <button type="submit" disabled={loading || !ready} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  {loading ? 'Ukladám...' : 'Nastaviť nové heslo'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-dim)' }}>
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>
    </div>
  );
}
