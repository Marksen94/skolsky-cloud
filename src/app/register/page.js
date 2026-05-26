'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase, CLASSES } from '@/lib/supabase';
import { CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', class: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) { setError('Heslá sa nezhodujú.'); return; }
    if (form.password.length < 6) { setError('Heslo musí mať aspoň 6 znakov.'); return; }
    if (!form.class) { setError('Vyber svoju triedu.'); return; }
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });
    if (authError) {
      setError(authError.message.includes('already registered') ? 'Tento email je už zaregistrovaný.' : 'Chyba: ' + authError.message);
      setLoading(false); return;
    }

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id, first_name: form.firstName, last_name: form.lastName,
      email: form.email, class: form.class, status: 'pending', is_admin: false,
    });
    if (profileError) { setError('Chyba: ' + profileError.message); setLoading(false); return; }

    await supabase.auth.signOut();
    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center animate-slide-up shadow-card">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-school-navy mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Žiadosť odoslaná!
          </h2>
          <p className="text-school-muted text-sm mb-5">
            Tvoja registrácia bola prijatá a čaká na schválenie správcom.
          </p>
          <div className="bg-school-light rounded-xl p-4 mb-5 text-left text-sm space-y-1.5">
            <p className="font-semibold text-school-navy mb-2">Čo urobiť ďalej:</p>
            <p className="text-school-muted">1. Napíš správcovi na Instagram alebo email</p>
            <p className="text-school-muted">2. Oznám meno a triedu <strong className="text-school-navy">{form.class}</strong></p>
            <p className="text-school-muted">3. Po schválení sa môžeš prihlásiť</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-school-blue mb-6 space-y-1">
            <p>📧 <strong>{process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@skola.sk'}</strong></p>
            <p>📱 Instagram: <strong>@https_riso</strong></p>
          </div>
          <Link href="/" className="btn-primary block text-center">Späť na prihlásenie</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/40 flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md p-1.5 mx-auto mb-4">
            <Image src="/logo.png" alt="Logo školy" width={52} height={52} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
            Spojená škola Kollárova 17, Sečovce
          </h1>
          <p className="text-school-muted text-sm mt-1">Školský cloudový systém</p>
        </div>

        <div className="card shadow-card animate-slide-up">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
              Registrácia
            </h2>
            <p className="text-school-muted text-sm mt-1">Po registrácii čakáš na schválenie správcu.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-school-navy mb-1.5">Meno *</label>
                <input name="firstName" type="text" className="input-field" placeholder="Ján"
                  value={form.firstName} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-school-navy mb-1.5">Priezvisko *</label>
                <input name="lastName" type="text" className="input-field" placeholder="Novák"
                  value={form.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-school-navy mb-1.5">Email *</label>
              <input name="email" type="email" className="input-field" placeholder="jan.novak@email.com"
                value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-school-navy mb-1.5">Trieda *</label>
              <select name="class" className="input-field" value={form.class} onChange={handleChange} required>
                <option value="">-- Vyber triedu --</option>
                {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-school-navy mb-1.5">Heslo *</label>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'} className="input-field pr-12"
                  placeholder="min. 6 znakov" value={form.password} onChange={handleChange} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-school-muted hover:text-school-navy transition-colors">
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-school-navy mb-1.5">Potvrdiť heslo *</label>
              <input name="confirmPassword" type={showPw ? 'text' : 'password'} className="input-field"
                placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              ⚠️ Po registrácii <strong>napíš správcovi</strong> (Instagram @https_riso) aby schválil tvoj účet.
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Registrujem...' : 'Zaregistrovať sa'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-gray-100 text-center">
            <Link href="/" className="text-sm text-school-muted hover:text-school-blue flex items-center justify-center gap-1 transition-colors">
              <ArrowLeft size={14} /> Späť na prihlásenie
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-school-muted/60 mt-4">
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>
    </div>
  );
}
