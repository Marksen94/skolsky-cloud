'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase, CLASSES } from '@/lib/supabase';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '', class: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Heslá sa nezhodujú.');
      return;
    }
    if (form.password.length < 6) {
      setError('Heslo musí mať aspoň 6 znakov.');
      return;
    }
    if (!form.class) {
      setError('Vyber svoju triedu.');
      return;
    }

    setLoading(true);

    // Vytvor auth účet
    const { data, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        setError('Tento email je už zaregistrovaný.');
      } else {
        setError('Chyba pri registrácii: ' + authError.message);
      }
      setLoading(false);
      return;
    }

    // Vlož profil s pending stavom
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      first_name: form.firstName,
      last_name: form.lastName,
      email: form.email,
      class: form.class,
      status: 'pending',
      is_admin: false,
    });

    if (profileError) {
      setError('Chyba pri ukladaní profilu: ' + profileError.message);
      setLoading(false);
      return;
    }

    // Odhlásiť – nesmie sa prihlásiť pred schválením
    await supabase.auth.signOut();

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="min-h-screen bg-school-light flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center animate-slide-up">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-school-navy mb-2" style={{ fontFamily: 'Crimson Pro, serif' }}>
            Žiadosť odoslaná!
          </h2>
          <p className="text-school-muted text-sm mb-4">
            Tvoja registrácia bola prijatá a čaká na schválenie správcom.
          </p>
          <div className="bg-school-light rounded-lg p-4 mb-6 text-left text-sm">
            <p className="font-semibold text-school-navy mb-2">Čo urobiť ďalej:</p>
            <ol className="space-y-1 text-school-muted list-decimal list-inside">
              <li>Napíš správcovi na Instagram alebo email</li>
              <li>Oznám mu svoje meno a triedu <strong className="text-school-navy">{form.class || ''}</strong></li>
              <li>Po schválení sa môžeš prihlásiť</li>
            </ol>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-school-blue mb-6">
            📧 Email: <strong>{process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'admin@skola.sk'}</strong>
            <br />📱 Instagram: <strong>@https_riso</strong>
          </div>
          <Link href="/" className="btn-primary block text-center">
            Späť na prihlásenie
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-school-light flex items-center justify-center p-6">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="school-emblem mx-auto mb-3">
            <span className="text-2xl font-bold text-school-navy" style={{ fontFamily: 'serif' }}>Š</span>
          </div>
          <h1 className="text-2xl font-bold text-school-navy" style={{ fontFamily: 'Crimson Pro, serif' }}>
            Spojená škola Sečovce
          </h1>
          <p className="text-school-muted text-sm">Školský cloudový systém</p>
        </div>

        <div className="card animate-slide-up">
          <h2 className="text-2xl font-bold text-school-navy mb-1" style={{ fontFamily: 'Crimson Pro, serif' }}>
            Registrácia
          </h2>
          <p className="text-school-muted text-sm mb-6">
            Po registrácii bude tvoj účet čakať na schválenie správcu.
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-school-navy mb-1">Meno *</label>
                <input name="firstName" type="text" className="input-field" placeholder="Ján"
                  value={form.firstName} onChange={handleChange} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-school-navy mb-1">Priezvisko *</label>
                <input name="lastName" type="text" className="input-field" placeholder="Novák"
                  value={form.lastName} onChange={handleChange} required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-school-navy mb-1">Email *</label>
              <input name="email" type="email" className="input-field" placeholder="jan.novak@email.com"
                value={form.email} onChange={handleChange} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-school-navy mb-1">Trieda *</label>
              <select name="class" className="input-field" value={form.class} onChange={handleChange} required>
                <option value="">-- Vyber triedu --</option>
                {CLASSES.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-school-navy mb-1">Heslo *</label>
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
              <label className="block text-sm font-medium text-school-navy mb-1">Potvrdiť heslo *</label>
              <input name="confirmPassword" type={showPw ? 'text' : 'password'} className="input-field"
                placeholder="••••••••" value={form.confirmPassword} onChange={handleChange} required />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              ⚠️ Po registrácii <strong>napíš správcovi</strong> (Instagram / email) aby schválil tvoj účet.
              Bez schválenia sa nebudeš môcť prihlásiť.
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Registrujem...' : 'Zaregistrovať sa'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-school-muted">
              Už máš účet?{' '}
              <Link href="/" className="text-school-blue font-medium hover:underline">
                Prihlásiť sa
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
