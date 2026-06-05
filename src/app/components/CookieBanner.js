'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Cookie, X, Check } from 'lucide-react';

const CONSENT_KEY = 'cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONSENT_KEY);
      if (!saved) setVisible(true);
    } catch {
      // localStorage not available (e.g. private browsing with restrictions)
    }
  }, []);

  function accept() {
    try { localStorage.setItem(CONSENT_KEY, 'accepted'); } catch {}
    setVisible(false);
  }

  function decline() {
    try { localStorage.setItem(CONSENT_KEY, 'declined'); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Súhlas s cookies"
      className="fixed bottom-4 left-4 z-[80] w-[calc(100%-2rem)] max-w-lg animate-slide-up"
    >
      <div
        className="rounded-2xl shadow-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: 'rgba(180,100,0,0.12)' }}
          >
            <Cookie size={18} style={{ color: '#d97706' }} />
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Táto aplikácia používa iba nevyhnutné technické cookies.{' '}
            <Link
              href="/privacy"
              className="underline font-semibold"
              style={{ color: 'var(--accent-link)' }}
            >
              Viac info
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
          <button
            onClick={decline}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: 'var(--surface-2)',
              color: 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
            aria-label="Odmietnuť cookies"
          >
            <X size={13} /> Odmietnuť
          </button>
          <button
            onClick={accept}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #0D1F3C, #1A3A6B)' }}
            aria-label="Prijať cookies"
          >
            <Check size={13} /> Prijať
          </button>
        </div>
      </div>
    </div>
  );
}
