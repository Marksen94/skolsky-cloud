'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `https://gdusecovce-cloud.vercel.app/auth/callback?next=/update-password`,
      });

      if (resetError) {
        setError('Chyba: ' + resetError.message);
      } else {
        setSuccessMsg(`Email s odkazom na resetovanie hesla bol odoslaný na adresu ${email}. Skontrolujte si schránku (vrátane spamu).`);
      }
    } catch (err) {
      console.error(err);
      setError('Nastala neočakávaná chyba pri resetovaní hesla.');
    } finally {
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
            <Image src="/logo.png" alt="Logo školy" width={52} height={52} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Spojená škola Kollárova 17, Sečovce
          </h1>
        </div>

        <div className="card shadow-card">
          <Link href="/" className="flex items-center gap-1.5 text-sm mb-6 transition-colors font-medium" style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={15} /> Späť na prihlásenie
          </Link>

          {successMsg ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(5,150,105,0.15)' }}>
                <CheckCircle size={28} style={{ color: '#10b981' }} />
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
                Odkaz bol odoslaný!
              </h2>
              <p className="text-sm leading-relaxed px-2" style={{ color: 'var(--text-muted)' }}>
                {successMsg}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
                  Zabudnuté heslo 🔑
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Zadajte svoj e-mail a pošleme vám odkaz na nastavenie nového hesla.
                </p>
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2" style={{ background: 'rgba(200,32,10,0.1)', color: '#ef4444', border: '1px solid rgba(200,32,10,0.25)' }}>
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Emailová adresa</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                    <input type="email" className="input-field pl-10"
                      placeholder="tvoj@email.com"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                  {loading ? 'Odosielam...' : (
                    <>
                      <Mail size={16} /> Odoslať odkaz na reset
                    </>
                  )}
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
