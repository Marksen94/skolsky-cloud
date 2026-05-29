'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Lock, Eye, EyeOff } from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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

    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      setError('Chyba pri zmene hesla: ' + updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md p-1.5 mx-auto mb-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Image src="/logo.png" alt="Logo školy" width={52} height={52} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Spojená škola Kollárova 17, Sečovce
          </h1>
        </div>

        <div className="card shadow-card">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
              Nové heslo 🔑
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Zadajte svoje nové prístupové heslo do školského cloudu.
            </p>
          </div>

          {success ? (
            <div className="px-4 py-4 rounded-xl text-sm font-medium text-center" style={{ background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.25)', color: '#10b981' }}>
              🎉 Heslo bolo úspešne zmenené!<br />
              <span className="text-xs font-normal" style={{ color: 'rgba(5,150,105,0.7)' }}>Presmeruvávam ťa na prihlasovaciu stránku...</span>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
                  ⚠️ {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Nové heslo</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} className="input-field pl-10 pr-10"
                    placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Potvrďte nové heslo</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input type={showPassword ? 'text' : 'password'} className="input-field pl-10"
                    placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-4">
                {loading ? 'Ukladám...' : 'Nastaviť nové heslo'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--text-dim)' }}>
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>
    </div>
  );
}
