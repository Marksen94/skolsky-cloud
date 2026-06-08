'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export default function SummerNotification() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    const isInSummer =
      month === 5 ||   // jún
      month === 6 ||   // júl
      month === 7;     // august (celý mesiac)

    if (!isInSummer) return;

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
  const isLastDay = now.getMonth() === 7 && now.getDate() === 31;

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-2xl animate-slide-up"
      role="alert"
      aria-live="polite"
    >
      <div
        className="rounded-2xl p-4 flex items-start sm:items-center gap-3"
        style={{
          background: isLastDay
            ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
            : 'linear-gradient(135deg, #78350f, #92400e)',
          border: isLastDay
            ? '1px solid rgba(239,68,68,0.6)'
            : '1px solid rgba(251,191,36,0.5)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        {/* Ikona */}
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0"
          style={{ background: isLastDay ? 'rgba(239,68,68,0.25)' : 'rgba(251,191,36,0.2)' }}
        >
          <AlertTriangle size={18} style={{ color: isLastDay ? '#fca5a5' : '#fde68a' }} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: isLastDay ? '#fca5a5' : '#fde68a' }}>
            {isLastDay
              ? '⚠️ Dnes je posledný deň — 31. august!'
              : '⚠️ Upozornenie: koniec školského roka'}
          </p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: isLastDay ? '#fecaca' : '#fef3c7' }}>
            {isLastDay
              ? 'Zajtra (1. septembra) budú všetky súbory na cloude vymazané. Stiahni si dôležité materiály!'
              : 'Všetky súbory na cloude budú vymazané 1. septembra. Do konca augusta si stiahni dôležité materiály.'}
          </p>
        </div>

        {/* Zavrieť */}
        <button
          onClick={dismiss}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors hover:opacity-70"
          style={{ color: isLastDay ? '#fca5a5' : '#fde68a' }}
          aria-label="Zavrieť upozornenie"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
