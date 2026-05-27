'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Skontroluj existujúcu session (callback ju už nastavil)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      }
    });

    // Zachyť PASSWORD_RECOVERY alebo SIGNED_IN udalosť
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError('Chyba pri aktualizácii hesla: ' + updateError.message);
      setLoading(false);
      return;
    }

    // Odhlásiť po zmene hesla, nech sa používateľ prihlási čisto
    await supabase.auth.signOut();
    setSuccess(true);
    setTimeout(() => router.push('/'), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md p-1.5 mx-auto mb-3">
            <Image src="/logo.png" alt="Logo" width={52} height={52} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
            Spojená škola Kollárova 17, Sečovce
          </h1>
        </div>

        <div className="card shadow-card">
          {success ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-school-navy mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                Heslo bolo úspešne zmenené!
              </h2>
              <p className="text-school-muted text-sm">O 3 sekundy vás presmerujeme na prihlásenie...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <KeyRound size={18} className="text-school-blue" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Nastavenie nového hesla
                  </h2>
                  <p className="text-school-muted text-xs">Zadajte nové heslo pre váš účet</p>
                </div>
              </div>

              {!ready && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                  Načítavam reláciu, chvíľu počkajte...
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                  ⚠️ {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-school-navy mb-1.5">Nové heslo</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="input-field pr-12"
                      placeholder="min. 6 znakov"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      disabled={!ready}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-school-muted hover:text-school-navy"
                    >
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-school-navy mb-1.5">Zopakujte nové heslo</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field"
                    placeholder="zopakujte heslo"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    disabled={!ready}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !ready}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? 'Ukladám...' : 'Nastaviť nové heslo'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-school-muted/50 mt-6">
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>
    </div>
  );
}
