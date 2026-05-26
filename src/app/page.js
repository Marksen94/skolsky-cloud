'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, BookOpen, Shield, Users } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Ak je user prihlásený, presmeruj
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectUser(session.user.id);
    });
  }, []);

  async function redirectUser(userId) {
    const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, status')
      .eq('id', userId)
      .single();

    if (profile?.is_admin) {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Nesprávny email alebo heslo.');
      setLoading(false);
      return;
    }

    // Skontroluj stav účtu
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, is_admin')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      setError('Profil nebol nájdený. Kontaktuj správcu.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.status === 'pending') {
      setError('Tvoj účet čaká na schválenie. Napíš nám na Instagram alebo email.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.status === 'rejected') {
      setError('Tvoj účet bol zamietnutý. Kontaktuj správcu školy.');
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    if (profile.is_admin) {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Ľavý panel – brand */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0D1F3C 0%, #1A3A6B 60%, #0D1F3C 100%)',
        }}
      >
        {/* Dekoratívne kruhy */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #C8A84B, transparent)' }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #C8A84B, transparent)' }} />

        {/* Logo & Názov školy */}
        <div className="relative z-10">
          <div className="school-emblem mb-6">
            <span className="text-3xl font-bold text-school-navy" style={{ fontFamily: 'serif' }}>Š</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Crimson Pro, serif' }}>
            Spojená škola
          </h1>
          <p className="text-2xl text-school-accent font-semibold" style={{ fontFamily: 'Crimson Pro, serif' }}>
            Sečovce
          </p>
          <p className="text-blue-200 mt-4 text-sm tracking-widest uppercase">
            Školský cloudový systém
          </p>
        </div>

        {/* Benefity */}
        <div className="relative z-10 space-y-6">
          <FeatureItem icon={<BookOpen size={20} />} title="Zdieľaj materiály" desc="Poznámky, fotené písomky, prezentácie – všetko na jednom mieste." />
          <FeatureItem icon={<Shield size={20} />} title="Zabezpečený prístup" desc="Každá trieda má vlastný priestor. Nikto iný nevidí vaše materiály." />
          <FeatureItem icon={<Users size={20} />} title="Len pre žiakov školy" desc="Registráciu schvaľuje správca. Žiadny cudzí nemá prístup." />
        </div>

        <p className="relative z-10 text-blue-300 text-xs">
          © {new Date().getFullYear()} Spojená škola Sečovce
        </p>
      </div>

      {/* Pravý panel – login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-school-light">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="school-emblem mx-auto mb-3">
              <span className="text-2xl font-bold text-school-navy" style={{ fontFamily: 'serif' }}>Š</span>
            </div>
            <h1 className="text-2xl font-bold text-school-navy" style={{ fontFamily: 'Crimson Pro, serif' }}>
              Spojená škola Sečovce
            </h1>
          </div>

          <div className="card animate-slide-up">
            <h2 className="text-2xl font-bold text-school-navy mb-1" style={{ fontFamily: 'Crimson Pro, serif' }}>
              Prihlásenie
            </h2>
            <p className="text-school-muted text-sm mb-6">Zadaj svoje školské údaje</p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-school-navy mb-1">Email</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="tvoj@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-school-navy mb-1">Heslo</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className="input-field pr-12"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-school-muted hover:text-school-navy transition-colors">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                {loading ? 'Prihlasujem...' : 'Prihlásiť sa'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-school-muted">
                Ešte nemáš účet?{' '}
                <Link href="/register" className="text-school-blue font-medium hover:underline">
                  Zaregistruj sa
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-school-muted mt-4">
            Po registrácii čakáš na schválenie správcu školy.
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, title, desc }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-school-accent flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-white font-medium text-sm">{title}</p>
        <p className="text-blue-200 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
