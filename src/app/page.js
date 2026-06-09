'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, BookOpen, Shield, Users, ArrowRight, Sparkles } from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) throw error;
        if (session?.user?.id) redirectUser(session.user.id);
      })
      .catch(err => {
        console.error('Error getting session:', err);
      });
  }, []);

  async function redirectUser(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles').select('is_admin, status').eq('id', userId).single();
      if (error) throw error;
      if (profile?.is_admin) {
        router.push('/admin');
      } else if (profile?.status === 'approved') {
        router.push('/dashboard');
      } else {
        if (profile?.status === 'pending') {
          setError('Tvoj účet čaká na schválenie. Napíš nám na Instagram alebo email.');
        } else if (profile?.status === 'rejected') {
          setError('Tvoj účet bol zamietnutý. Kontaktuj správcu školy.');
        } else {
          setError('Profil nebol nájdený. Kontaktuj správcu.');
        }
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Error redirecting user:', err);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) { setError('Nesprávny email alebo heslo.'); setLoading(false); return; }
      if (!data?.user?.id) { setError('Prihlásenie zlyhalo. Skús znova.'); setLoading(false); return; }
      const { data: profile, error: profileErr } = await supabase
        .from('profiles').select('status, is_admin').eq('id', data.user.id).single();
      if (profileErr) throw profileErr;
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
    } catch (err) {
      console.error(err);
      setError('Nastala neočakávaná chyba pri prihlasovaní.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ═══ ĽAVÝ PANEL – vždy tmavý ═══ */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #07111F 0%, #0D1F3C 55%, #122444 100%)' }}>

        {/* Dekoratívna mriežka */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }} />

        {/* Svietiace kruhy */}
        <div className="absolute top-[-10%] right-[-8%] w-[480px] h-[480px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #C8200A 0%, transparent 65%)', animation: 'slowPulse 9s ease-in-out infinite', willChange: 'transform, opacity' }} />
        <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #1565C0 0%, transparent 65%)', animation: 'slowPulse 7s ease-in-out infinite reverse', willChange: 'transform, opacity' }} />

        {/* Červená čiara hore */}
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #C8200A 40%, #e53e3e 60%, transparent 100%)' }} />

        <div className="relative z-10 flex flex-col h-full p-14">

          {/* Logo + škola */}
          <div className="flex items-center gap-4 mb-14">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl blur-md opacity-40"
                style={{ background: 'linear-gradient(135deg, #C8200A, #1565C0)' }} />
              <div className="relative w-[60px] h-[60px] bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shadow-xl p-1.5">
                <Image src="/logo.png" alt="Logo školy" width={44} height={44} className="object-contain" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold tracking-[0.2em] text-red-400 uppercase">Cloud pre žiakov</span>
                <div className="w-1 h-1 rounded-full bg-red-400 opacity-60" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-blue-400/70 uppercase">2026</span>
              </div>
              <h1 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                Spojená škola Kollárova 17, Sečovce
              </h1>
            </div>
          </div>

          {/* Hlavný nadpis */}
          <div className="mb-12 flex-shrink-0">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
              <Sparkles size={12} className="text-yellow-400" />
              <span className="text-white/70 text-xs font-medium tracking-wide">Vzdelávanie v digitálnej dobe.</span>
            </div>
            <h2 className="text-5xl font-bold text-white leading-[1.1] mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
              Tvoje materiály,<br />
              <span className="relative inline-block">
                <span className="relative z-10" style={{ color: '#ef6461' }}>kedykoľvek.</span>
                <span className="absolute bottom-1 left-0 right-0 h-[3px] rounded-full opacity-50"
                  style={{ background: 'linear-gradient(90deg, #C8200A, transparent)' }} />
              </span>
            </h2>
            <p className="text-blue-200/50 text-sm leading-relaxed max-w-[340px]">
              Cloudové úloziško poznámok, fotených písomiek a prezentácií — vytvorené pre žiakov Spojenej školy Kollárova 17, Sečovce.
            </p>
          </div>

          {/* Feature karty */}
          <div className="space-y-3 flex-1">
            <FeatureCard icon={<BookOpen size={16} />} accent="#ef4444"
              title="Zdieľaj a čerpaj"
              desc="Nahrávaj vlastné súbory a využívaj obsah spolužiakov. Všetky predmety prehľadne na dosah ruky." />
            <FeatureCard icon={<Shield size={16} />} accent="#3b82f6"
              title="Bezpečný priestor triedy"
              desc="Každá trieda má uzavretý digitálny priestor. Vaše dokumenty zostanú iba medzi vami." />
            <FeatureCard icon={<Users size={16} />} accent="#a855f7"
              title="Len overení členovia"
              desc="Každého nového žiaka schvaľuje správca školy. Cudzí do systému nevstúpia." />
          </div>

          {/* Pätička */}
          <div className="mt-10 pt-6 border-t border-white/8 flex items-center justify-between">
            <p className="text-white/25 text-xs">© 2026 RU-MONT s. r. o.</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/30 text-xs">Systém aktívny</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ PRAVÝ PANEL – reaguje na temu ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden transition-colors duration-300"
        style={{ background: 'var(--bg-2)' }}>

        {/* Dekoratívne pozadie */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, rgba(26,58,107,0.05) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(200,32,10,0.03) 0%, transparent 50%)`
        }} />

        {/* Prepínač temy – vpravo hore */}
        <div className="fixed top-5 right-5 z-20">
          <ThemeToggle />
        </div>

        <div className={`relative z-10 w-full max-w-[420px] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg p-1.5 mx-auto mb-3 border"
              style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <Image src="/logo.png" alt="Logo školy" width={44} height={44} className="object-contain" />
            </div>
            <h1 className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
              Spojená škola Kollárova 17, Sečovce
            </h1>
          </div>

          {/* Prihlasovacia karta */}
          <div className="rounded-3xl overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)',
            }}>

            {/* Farebný pruh */}
            <div className="h-1.5 w-full"
              style={{ background: 'linear-gradient(90deg, #0D1F3C 0%, #1A3A6B 40%, #C8200A 100%)' }} />

            <div className="p-6 sm:p-9">
              {/* Hlavička */}
              <div className="mb-8">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4 p-1.5"
                  style={{ background: 'linear-gradient(135deg, #0D1F3C, #1A3A6B)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Image src="/logo.png" alt="Logo školy" width={36} height={36} className="object-contain" />
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
                  Vitaj späť 👋
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Prihlás sa do školského cloudu</p>
              </div>

              {/* Chybová správa */}
              {error && (
                <div className="mb-5 px-4 py-3.5 rounded-2xl text-sm flex items-start gap-3"
                  style={{ background: 'rgba(200,32,10,0.1)', border: '1px solid rgba(200,32,10,0.25)', color: '#ef4444' }}>
                  <span className="text-base flex-shrink-0 mt-px">⚠️</span>
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Formulár */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold mb-2 tracking-wider uppercase" style={{ color: 'var(--text)' }}>
                    Email
                  </label>
                  <input type="email" className="input-field" placeholder="tvoj@email.com"
                    autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold tracking-wider uppercase" style={{ color: 'var(--text)' }}>
                      Heslo
                    </label>
                    <Link href="/forgot-password" className="text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent-link)' }}>
                      Zabudli ste heslo?
                    </Link>
                  </div>
                  <div className="relative">
                    <input type={showPw ? 'text' : 'password'} className="input-field pr-12"
                      autoComplete="current-password"
                      placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:scale-110"
                      style={{ color: 'var(--text-muted)' }}>
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2.5 mt-1">
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Prihlasujem...
                    </>
                  ) : (
                    <> Prihlásiť sa <ArrowRight size={15} strokeWidth={2.5} /> </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>alebo</span>
                <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              </div>

              {/* Registrácia */}
              <div className="text-center">
                <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Ešte nemáš účet?</p>
                <Link href="/register" className="block w-full py-3 rounded-xl font-semibold text-sm text-center transition-all duration-200"
                  style={{ background: 'var(--surface-2)', border: '1.5px solid var(--border)', color: 'var(--accent-link)' }}>
                  Zaregistruj sa
                </Link>
              </div>
            </div>

            <div className="px-6 sm:px-9 pb-6">
              <p className="text-center text-xs" style={{ color: 'var(--text-dim)' }}>
                Po registrácii čakáš na schválenie správcu školy.
              </p>
            </div>
          </div>

          <p className="text-center text-xs mt-5" style={{ color: 'var(--text-dim)' }}>
            Cloud Spojenej školy Sečovce
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, accent, title, desc }) {
  return (
    <div className="flex gap-4 items-start p-4 rounded-2xl border transition-all duration-300 hover:bg-white/5 group"
      style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform duration-300 group-hover:scale-105"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
        <span style={{ color: accent }}>{icon}</span>
      </div>
      <div>
        <p className="text-white font-semibold text-sm mb-0.5">{title}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(147,197,253,0.55)' }}>{desc}</p>
      </div>
    </div>
  );
}
