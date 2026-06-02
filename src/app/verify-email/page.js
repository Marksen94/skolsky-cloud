'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-md p-1.5 mx-auto mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <Image src="/logo.png" alt="Logo školy" width={52} height={52} className="object-contain" />
        </div>

        <div className="card shadow-card">
          <div className="text-4xl mb-4">📧</div>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Skontroluj email
          </h1>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-muted)' }}>
            Poslali sme ti odkaz na overenie emailovej adresy.
            Skontroluj si schránku (aj priečinok spam).
          </p>
          <div className="rounded-xl p-4 mb-6 text-sm text-left space-y-1.5"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Čo urobiť ďalej:</p>
            <p style={{ color: 'var(--text-muted)' }}>1. Klikni na odkaz v emaili</p>
            <p style={{ color: 'var(--text-muted)' }}>2. Počkaj na schválenie správcom školy</p>
            <p style={{ color: 'var(--text-muted)' }}>3. Po schválení sa môžeš prihlásiť</p>
          </div>
          <Link href="/" className="flex items-center justify-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={14} /> Späť na prihlásenie
          </Link>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: 'var(--text-dim)' }}>
          © 2026 RU-MONT s. r. o., Spojená škola Sečovce
        </p>
      </div>
    </div>
  );
}
