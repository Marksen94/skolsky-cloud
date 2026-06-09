'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CLASSES } from '@/lib/supabase';
import { CheckCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function RegisterPage() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', class: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
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

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          class: form.class,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Chyba pri registrácii.'); setLoading(false); return; }
      setSuccess(true);
    } catch (err) {
      setError('Sieťová chyba. Skontroluj pripojenie a skús znova.');
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
        <div className="card max-w-md w-full text-center animate-slide-up shadow-card">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(5,150,105,0.15)' }}>
            <CheckCircle size={32} style={{ color: '#10b981' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Žiadosť odoslaná!
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
            Tvoja registrácia bola prijatá a čaká na schválenie správcom.
          </p>
          <div className="rounded-xl p-4 mb-5 text-left text-sm space-y-1.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Čo urobiť ďalej:</p>
            <p style={{ color: 'var(--text-muted)' }}>1. Napíš správcovi na Instagram alebo email</p>
            <p style={{ color: 'var(--text-muted)' }}>2. Oznám meno a triedu <strong style={{ color: 'var(--text)' }}>{form.class}</strong></p>
            <p style={{ color: 'var(--text-muted)' }}>3. Po schválení sa môžeš prihlásiť</p>
          </div>
          <div className="rounded-xl p-3 text-xs mb-6" style={{ background: 'rgba(26,58,107,0.1)', border: '1px solid rgba(26,58,107,0.25)', color: 'var(--accent-link)' }}>
            <p>📧 <strong>{process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'rumont.sro@gmail.com'}</strong></p>
            <p>📱 Instagram: <strong>@rumont_sro</strong></p>
          </div>
          <Link href="/" className="btn-primary block text-center">Späť na prihlásenie</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="fixed top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md p-1.5 mx-auto mb-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Image src="/logo.png" alt="Logo školy" width={52} height={52} className="object-contain" />
          </div>
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Spojená škola Kollárova 17, Sečovce
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Cloud Spojenej školy Sečovce</p>
        </div>

        <div className="card shadow-card animate-slide-up">
          <div className="mb-6">
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
              Registrácia
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Po registrácii čakáš na schválenie správcu.</p>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-xl mb-4 text-sm" style={{ background: 'rgba(200,32,10,0.1)', border: '1px solid rgba(200,32,10,0.25)', color: '#ef4444' }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Meno *</label>
                <input name="firstName" type="text" className="input-field" placeholder="Ján"
                  autoComplete="given-name"
                  value={form.firstName} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Priezvisko *</label>
                <input name="lastName" type="text" className="input-field" placeholder="Novák"
                  autoComplete="family-name"
                  value={form.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Email *</label>
              <input name="email" type="email" className="input-field" placeholder="jan.novak@email.com"
                autoComplete="email"
                value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Trieda *</label>
              <select name="class" className="input-field" value={form.class} onChange={handleChange} required>
                <option value="">-- Vyber triedu --</option>
                {CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Heslo *</label>
              <div className="relative">
                <input name="password" type={showPw ? 'text' : 'password'} className="input-field pr-12"
                  autoComplete="new-password"
                  placeholder="min. 6 znakov" value={form.password} onChange={handleChange} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Potvrdiť heslo *</label>
              <div className="relative">
                <input name="confirmPassword" type={showConfirmPw ? 'text' : 'password'} className="input-field pr-12"
                  autoComplete="new-password"
                  placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="rounded-xl p-3 text-xs" style={{ background: 'rgba(180,100,0,0.12)', border: '1px solid rgba(180,100,0,0.3)', color: 'var(--warning-text, #d97706)' }}>
              ⚠️ Po registrácii <strong>napíš správcovi</strong> (Instagram @rumont_sro) aby schválil tvoj účet.
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Registrujem...' : 'Zaregistrovať sa'}
            </button>
          </form>

          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <Link href="/" className="flex items-center justify-center gap-1 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
              <ArrowLeft size={14} /> Späť na prihlásenie
            </Link>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-dim)' }}>
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>
    </div>
  );
}
