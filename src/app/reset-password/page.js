'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, KeyRound, CheckCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase nastaví session z URL tokenu automaticky
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true);
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Heslo musí mať aspoň 6 znakov.'); return; }
    if (password !== confirm) { setError('Heslá sa nezhodujú.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError('Chyba: ' + error.message); setLoading(false); return; }
    setSuccess(true);
    setTimeout(() => router.push('/'), 3000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
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
                Heslo zmenené!
              </h2>
              <p className="text-school-muted text-sm">Budeme ťa presmerovať na prihlásenie...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <KeyRound size={18} className="text-school-blue" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Nové heslo
                  </h2>
                  <p className="text-school-muted text-xs">Zadaj nové heslo pre svoj účet</p>
                </div>
              </div>

              {!ready && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl mb-4 text-sm">
                  ⏳ Čakáme na overenie odkazu... Ak si sem prišiel cez email, počkaj chvíľu.
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
                    <input type={showPw ? 'text' : 'password'} className="input-field pr-12"
                      placeholder="min. 6 znakov" value={password}
                      onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-school-muted hover:text-school-navy">
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-school-navy mb-1.5">Potvrdenie hesla</label>
                  <input type={showPw ? 'text' : 'password'} className="input-field"
                    placeholder="zopakuj heslo" value={confirm}
                    onChange={e => setConfirm(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading || !ready}
                  className="btn-primary w-full flex items-center justify-center gap-2">
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
