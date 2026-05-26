'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

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

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (resetError) {
      setError('Chyba: ' + resetError.message);
    } else {
      setSuccessMsg(`Email s odkazom na resetovanie hesla bol odoslaný na adresu ${email}. Skontrolujte si schránku (vrátane spamu).`);
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
          <Link href="/" className="flex items-center gap-1.5 text-school-muted hover:text-school-navy text-sm mb-6 transition-colors font-medium">
            <ArrowLeft size={15} /> Späť na prihlásenie
          </Link>

          {successMsg ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={28} className="text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-school-navy mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                Odkaz bol odoslaný!
              </h2>
              <p className="text-school-muted text-sm leading-relaxed px-2">
                {successMsg}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-school-navy mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Zabudnuté heslo 🔑
                </h2>
                <p className="text-school-muted text-xs">
                  Zadajte svoj e-mail a pošleme vám odkaz na nastavenie nového hesla.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
                  <span>⚠️</span> {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-school-navy mb-1.5">Emailová adresa</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-school-muted" />
                    <input
                      type="email"
                      className="input-field pl-10"
                      placeholder="tvoj@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                >
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

        <p className="text-center text-xs text-school-muted/50 mt-6">
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>
    </div>
  );
}
