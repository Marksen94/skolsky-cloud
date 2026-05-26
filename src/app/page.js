'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, BookOpen, Shield, Users, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirectUser(session.user.id);
    });
  }, []);

  async function redirectUser(userId) {
    const { data: profile } = await supabase
      .from('profiles').select('is_admin, status').eq('id', userId).single();
    if (profile?.is_admin) router.push('/admin');
    else router.push('/dashboard');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) { setError('Nesprávny email alebo heslo.'); setLoading(false); return; }
    const { data: profile } = await supabase
      .from('profiles').select('status, is_admin').eq('id', data.user.id).single();
    if (!profile) {
      setError('Profil nebol nájdený. Kontaktuj správcu.');
      await supabase.auth.signOut(); setLoading(false); return;
    }
    if (profile.status === 'pending') {
      setError('Tvoj účet čaká na schválenie. Napíš nám na Instagram alebo email.');
      await supabase.auth.signOut(); setLoading(false); return;
    }
    if (profile.status === 'rejected') {
      setError('Tvoj účet bol zamietnutý. Kontaktuj správcu školy.');
      await supabase.auth.signOut(); setLoading(false); return;
    }
    if (profile.is_admin) router.push('/admin');
    else router.push('/dashboard');
  }

  return (
    <div className="min-h-screen flex">
      {/* Ľavý panel */}
      <div className="login-bg hidden lg:flex flex-col justify-between w-[48%] p-12 relative z-10">
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg p-1.5">
              <Image src="/logo.png" alt="Logo školy" width={52} height={52} className="object-contain" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
            Spojená škola
          </h1>
          <p className="text-2xl font-semibold mb-1" style={{ color: '#ef4444' }}>
            Kollárova 17, Sečovce
          </p>
          <p className="text-blue-300 text-sm tracking-widest uppercase mt-3 font-medium">
            Školský cloudový systém
          </p>

          <div className="mt-12 space-y-5">
            <Feature icon={<BookOpen size={18} />} title="Zdieľaj materiály"
              desc="Poznámky, fotené písomky, prezentácie – všetko na jednom mieste." />
            <Feature icon={<Shield size={18} />} title="Zabezpečený prístup"
              desc="Každá trieda má vlastný priestor. Nikto iný nevidí vaše materiály." />
            <Feature icon={<Users size={18} />} title="Len pre žiakov školy"
              desc="Registráciu schvaľuje správca. Žiadny cudzí nemá prístup." />
          </div>
        </div>

        <p className="relative z-10 text-blue-300/60 text-xs">
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>

      {/* Pravý panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 bg-gradient-to-br from-slate-50 to-blue-50/40">
        <div className="w-full max-w-md animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-md p-1.5 mx-auto mb-3">
              <Image src="/logo.png" alt="Logo školy" width={52} height={52} className="object-contain" />
            </div>
            <h1 className="text-xl font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
              Spojená škola Kollárova 17, Sečovce
            </h1>
          </div>

          {/* --- PRIHLÁSENIE --- */}
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-school-navy mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                Vitaj späť 👋
              </h2>
              <p className="text-school-muted">Prihlás sa do školského cloudu</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-school-navy mb-1.5">Email</label>
                <input type="email" className="input-field" placeholder="tvoj@email.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-school-navy">Heslo</label>
                </div>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} className="input-field pr-12"
                    placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-school-muted hover:text-school-navy transition-colors">
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="text-right mt-1.5">
                  <Link href="/forgot-password" className="text-xs text-school-blue hover:underline font-medium">
                    Zabudli ste heslo?
                  </Link>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {loading ? 'Prihlasujem...' : (<>Prihlásiť sa <ArrowRight size={16} /></>)}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-school-muted">
                Ešte nemáš účet?{' '}
                <Link href="/register" className="text-school-blue font-semibold hover:underline">
                  Zaregistruj sa
                </Link>
              </p>
            </div>

            <p className="text-center text-xs text-school-muted/60 mt-6">
              Po registrácii čakáš na schválenie správcu školy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-red-400 flex-shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-white font-semibold text-sm">{title}</p>
        <p className="text-blue-200/70 text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
