'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase automaticky spracuje tokeny z hashu v URL po kliknutí z mailu.
    // Skontrolujeme, či máme prístup k relácii. Ak nie, pre istotu počkáme.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Ak používateľ nemá v URL token alebo vypršal, povieme mu to
        console.log("Session nenájdená, čaká sa na spracovanie hash fragmentu...");
      }
    };
    checkSession();
  }, []);

  async function handleReset(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Heslá sa nezhodujú.');
      setLoading(false);
      return;
    }

    // Aktualizácia hesla priamo pre aktuálne overeného používateľa
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError('Chyba pri zmene hesla: ' + updateError.message);
    } else {
      setSuccess(true);
      // Po 3 sekundách presmerujeme žiaka na prihlásenie
      setTimeout(() => {
        router.push('/');
      }, 3000);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center p-6">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo a názov školy */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md p-1.5 mx-auto mb-3">
            <Image src="/logo.png" alt="Logo školy" width={52} height={52} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
            Spojená škola Kollárova 17, Sečovce
          </h1>
        </div>

        {/* Hlavná karta */}
        <div className="card shadow-card">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-school-navy mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
              Nové heslo 🔑
            </h2>
            <p className="text-school-muted text-xs">
              Zadajte svoje nové prístupové heslo do školského cloudu.
            </p>
          </div>

          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-4 rounded-xl text-sm font-medium text-center">
              🎉 Heslo bolo úspešne zmenené!<br />
              <span className="text-xs text-emerald-600 font-normal">Presmeruvávam ťa na prihlasovaciu stránku...</span>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  ⚠️ {error}
                </div>
              )}

              {/* Nové heslo */}
              <div>
                <label className="block text-sm font-semibold text-school-navy mb-1.5">Nové heslo</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pl-10 pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-school-muted hover:text-school-navy"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Potvrdenie hesla */}
              <div>
                <label className="block text-sm font-semibold text-school-navy mb-1.5">Potvrďte nové heslo</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field pl-10"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-4"
              >
                {loading ? 'Ukladám...' : 'Nastaviť nové heslo'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-school-muted/50 mt-6">
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>
    </div>
  );
}