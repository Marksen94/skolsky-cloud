'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff, BookOpen, Shield, Users, ArrowRight, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen flex bg-[#07111F]">

      {/* ═══ ĽAVÝ PANEL ═══ */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #07111F 0%, #0D1F3C 55%, #122444 100%)' }}>

        {/* Dekoratívna mriežka */}
        <div className="absolute inset-0 opacity-[0.035]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: '48px 48px'
        }} />

        {/* Svietiace kruhy v pozadí */}
        <div className="absolute top-[-10%] right-[-8%] w-[480px] h-[480px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #C8200A 0%, transparent 65%)', animation: 'slowPulse 9s ease-in-out infinite' }} />
        <div className="absolute bottom-[-15%] left-[-5%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #1565C0 0%, transparent 65%)', animation: 'slowPulse 7s ease-in-out infinite reverse' }} />
        <div className="absolute top-[45%] left-[30%] w-[250px] h-[250px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #C8200A 0%, transparent 65%)', animation: 'slowPulse 11s ease-in-out infinite' }} />

        {/* Dekoratívna červená čiara hore */}
        <div className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: 'linear-gradient(90deg, transparent 0%, #C8200A 40%, #e53e3e 60%, transparent 100%)' }} />

        <div className="relative z-10 flex flex-col h-full p-14">

          {/* Logo + názov školy */}
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
                <span className="text-[10px] font-bold tracking-[0.2em] text-red-400 uppercase">Školský Cloud</span>
                <div className="w-1 h-1 rounded-full bg-red-400 opacity-60" />
                <span className="text-[10px] font-bold tracking-[0.2em] text-blue-400/70 uppercase">2026</span>
              </div>
              <h1 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                Spojená škola Sečovce
              </h1>
            </div>
          </div>

          {/* Hlavný nadpis */}
          <div className="mb-12 flex-shrink-0">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
              <Sparkles size={12} className="text-yellow-400" />
              <span className="text-white/70 text-xs font-medium tracking-wide">Zdieľaj vedomosti. Rás spoločne.</span>
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
              Centrálny priestor pre poznámky, fotené písomky a prezentácie. Prístupný len pre žiakov Spojenej školy Kollárova 17.
            </p>
          </div>

          {/* Feature karty */}
          <div className="space-y-3 flex-1">
            <FeatureCard
              icon={<BookOpen size={16} />}
              accent="#ef4444"
              title="Zdieľaj materiály"
              desc="Poznámky, fotené písomky, prezentácie – všetko na jednom mieste."
            />
            <FeatureCard
              icon={<Shield size={16} />}
              accent="#3b82f6"
              title="Zabezpečený prístup"
              desc="Každá trieda má vlastný priestor. Nikto iný nevidí vaše materiály."
            />
            <FeatureCard
              icon={<Users size={16} />}
              accent="#a855f7"
              title="Len pre žiakov školy"
              desc="Registráciu schvaľuje správca. Žiadny cudzí nemá prístup."
            />
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

      {/* ═══ PRAVÝ PANEL ═══ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #F8FAFC 0%, #EFF3FB 50%, #E8EEF8 100%)' }}>

        {/* Jemná textúra v pozadí */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 20% 80%, rgba(26,58,107,0.06) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(200,32,10,0.04) 0%, transparent 50%)`
        }} />

        {/* Dekoratívny oblúk */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] opacity-5"
          style={{ background: 'radial-gradient(circle at top right, #1A3A6B, transparent 70%)' }} />

        <div className={`relative z-10 w-full max-w-[420px] transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-lg p-1.5 mx-auto mb-3 border border-gray-100">
              <Image src="/logo.png" alt="Logo školy" width={44} height={44} className="object-contain" />
            </div>
            <h1 className="text-lg font-bold text-school-navy" style={{ fontFamily: 'Sora, sans-serif' }}>
              Spojená škola Kollárova 17, Sečovce
            </h1>
          </div>

          {/* Prihlasovacia karta */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100/80 overflow-hidden"
            style={{ boxShadow: '0 24px 80px rgba(13,31,60,0.13), 0 4px 20px rgba(13,31,60,0.06)' }}>

            {/* Farebný pruh hore */}
            <div className="h-1.5 w-full"
              style={{ background: 'linear-gradient(90deg, #0D1F3C 0%, #1A3A6B 40%, #C8200A 100%)' }} />

            <div className="p-9">
              {/* Hlavička formulára */}
              <div className="mb-8">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #0D1F3C, #1A3A6B)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#0D1F3C' }}>
                  Vitaj späť 👋
                </h2>
                <p className="text-sm" style={{ color: '#6B7C96' }}>Prihlás sa do školského cloudu</p>
              </div>

              {/* Chybová správa */}
              {error && (
                <div className="mb-5 px-4 py-3.5 rounded-2xl text-sm flex items-start gap-3 border"
                  style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
                  <span className="text-base flex-shrink-0 mt-px">⚠️</span>
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* Formulár */}
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold mb-2 tracking-wider uppercase" style={{ color: '#0D1F3C' }}>
                    Email
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      className="enhanced-input"
                      placeholder="tvoj@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold tracking-wider uppercase" style={{ color: '#0D1F3C' }}>
                      Heslo
                    </label>
                    <Link href="/forgot-password" className="text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: '#1A3A6B' }}>
                      Zabudli ste heslo?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="enhanced-input pr-12"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 transition-all hover:scale-110 active:scale-95"
                      style={{ color: '#6B7C96' }}>
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="login-btn w-full flex items-center justify-center gap-2.5 mt-1"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" />
                      </svg>
                      Prihlasujem...
                    </>
                  ) : (
                    <>
                      Prihlásiť sa
                      <ArrowRight size={15} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px" style={{ background: '#E8EEF8' }} />
                <span className="text-xs font-medium" style={{ color: '#A0AEC0' }}>alebo</span>
                <div className="flex-1 h-px" style={{ background: '#E8EEF8' }} />
              </div>

              {/* Registrácia */}
              <div className="text-center">
                <p className="text-sm mb-3" style={{ color: '#6B7C96' }}>
                  Ešte nemáš účet?
                </p>
                <Link href="/register" className="register-btn w-full flex items-center justify-center gap-2">
                  Zaregistruj sa
                </Link>
              </div>
            </div>

            {/* Pätička karty */}
            <div className="px-9 pb-6">
              <p className="text-center text-xs" style={{ color: '#B0BEC5' }}>
                Po registrácii čakáš na schválenie správcu školy.
              </p>
            </div>
          </div>

          {/* Pod kartou */}
          <p className="text-center text-xs mt-5" style={{ color: '#94A3B8' }}>
            Kollárova 17, Sečovce &nbsp;·&nbsp; Školský cloudový systém
          </p>
        </div>
      </div>

      {/* Globálne štýly */}
      <style jsx global>{`
        @keyframes slowPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.7; }
        }

        .enhanced-input {
          width: 100%;
          padding: 12px 16px;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          background: #FAFCFF;
          color: #0D1F3C;
          font-size: 14px;
          font-family: var(--font-body);
          transition: all 0.2s ease;
          outline: none;
        }
        .enhanced-input::placeholder { color: #A0AEC0; }
        .enhanced-input:hover { border-color: #CBD5E1; background: #F8FBFF; }
        .enhanced-input:focus {
          border-color: #1A3A6B;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(26,58,107,0.08);
        }

        .login-btn {
          padding: 14px 24px;
          border-radius: 14px;
          font-weight: 700;
          font-size: 14px;
          font-family: var(--font-body);
          letter-spacing: 0.01em;
          color: white;
          background: linear-gradient(135deg, #0D1F3C 0%, #1A3A6B 60%, #1e4a8a 100%);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 16px rgba(13,31,60,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(13,31,60,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
          background: linear-gradient(135deg, #0D1F3C 0%, #1e4080 60%, #2255a0 100%);
        }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .register-btn {
          display: flex;
          padding: 12px 24px;
          border-radius: 14px;
          font-weight: 600;
          font-size: 14px;
          font-family: var(--font-body);
          color: #1A3A6B;
          background: #EFF3FB;
          border: 1.5px solid #DBEAFE;
          cursor: pointer;
          transition: all 0.2s ease;
          text-decoration: none;
        }
        .register-btn:hover {
          background: #E1EAFF;
          border-color: #BFDBFE;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(26,58,107,0.1);
        }
        .register-btn:active { transform: translateY(0); }
      `}</style>
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
