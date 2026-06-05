'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

// Zobrazuje sa od 1. júna do 31. augusta každého roka.
// Upozorňuje na vymazanie súborov 1. septembra.
export default function SummerNotification() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth(); // 0=jan, 5=jún, 7=aug
    const day = now.getDate();

    const isInSummer =
      month === 5 ||               // celý jún
      month === 6 ||               // celý júl
      (month === 7 && day <= 31);  // celý august

    if (!isInSummer) return;

    // Dismiss sa pamätá na celý deň
    const todayKey = `summer_notice_dismissed_${now.getFullYear()}_${month}_${day}`;
    try {
      if (localStorage.getItem(todayKey)) return;
    } catch {}

    setVisible(true);
  }, []);

  function dismiss() {
    const now = new Date();
    const todayKey = `summer_notice_dismissed_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
    try { localStorage.setItem(todayKey, '1'); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  const now = new Date();
  const isLastDay = now.getMonth() === 7 && now.getDate() === 31; // 31. august

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[90] w-[calc(100%-2rem)] max-w-2xl animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div
        className="rounded-2xl p-4 flex items-start sm:items-center gap-3"
        style={{
          background: isLastDay
            ? 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(239,68,68,0.12))'
            : 'linear-gradient(135deg, rgba(217,119,6,0.18), rgba(251,191,36,0.1))',
          border: isLastDay
            ? '1px solid rgba(220,38,38,0.45)'
            : '1px solid rgba(251,191,36,0.45)',
          backdropFilter: 'blur(16px)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Ikona */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0"
          style={{ background: isLastDay ? 'rgba(220,38,38,0.2)' : 'rgba(217,119,6,0.2)' }}
        >
          <AlertTriangle size={18} style={{ color: isLastDay ? '#ef4444' : '#d97706' }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: isLastDay ? '#ef4444' : '#d97706' }}>
            {isLastDay
              ? '⚠️ Dnes je posledný deň — 31. august!'
              : '⚠️ Upozornenie: koniec školského roka'}
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {isLastDay
              ? 'Zajtra (1. septembra) budú všetky súbory na cloude vymazané. Stiahni si dôležité materiály!'
              : 'Všetky súbory na cloude budú vymazané 1. septembra. Do konca augusta si stiahni dôležité materiály.'}
          </p>
        </div>

        {/* Zavrieť */}
        <button
          onClick={dismiss}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Zavrieť upozornenie"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
