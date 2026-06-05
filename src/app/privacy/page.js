'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck, ArrowLeft, Mail, Calendar, Database, Lock,
  Eye, Trash2, Cookie, MapPin, AlertCircle,
} from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="school-header">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm p-1"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <p className="text-white font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                Spojená škola Kollárova 17, Sečovce
              </p>
              <p className="text-blue-200 text-xs">Zásady ochrany osobných údajov</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/"
              className="flex items-center gap-1.5 text-blue-200 hover:text-white transition-colors text-sm font-medium">
              <ArrowLeft size={15} /> Späť
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">

        {/* Hero */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(26,58,107,0.1)', border: '1px solid rgba(26,58,107,0.2)' }}>
            <ShieldCheck size={30} style={{ color: 'var(--accent-link)' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Zásady ochrany osobných údajov
          </h1>
          <div className="flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Calendar size={14} />
            <span>Platné od 1. januára 2026</span>
          </div>
        </div>

        {/* Info box */}
        <div className="rounded-2xl p-4 mb-8 flex items-start gap-3 animate-slide-up"
          style={{ background: 'rgba(26,58,107,0.08)', border: '1px solid rgba(26,58,107,0.2)' }}>
          <AlertCircle size={18} style={{ color: 'var(--accent-link)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
            Tieto zásady vysvetľujú, aké osobné údaje zbierame, ako ich používame a aké máte práva
            v súvislosti s vašimi údajmi. Prevádzkovateľom systému je{' '}
            <strong>RU-MONT s. r. o.</strong> v spolupráci so{' '}
            <strong>Spojenou školou Kollárova 17, Sečovce</strong>.
          </p>
        </div>

        <div className="space-y-6 animate-slide-up">

          {/* 1. Aké údaje zbierame */}
          <section className="card shadow-card">
            <SectionHeader icon={<Database size={18} />} title="1. Aké osobné údaje zbierame" color="blue" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Pri registrácii a používaní systému zbierame nasledovné údaje:
              </p>
              <div className="space-y-2">
                {[
                  { label: 'Meno a priezvisko', desc: 'Zobrazuje sa pri nahraných súboroch v rámci vašej triedy.' },
                  { label: 'Emailová adresa', desc: 'Slúži na prihlásenie a prípadné obnovenie hesla.' },
                  { label: 'Trieda', desc: 'Určuje, ku ktorým súborom máte prístup.' },
                  { label: 'Nahrané súbory', desc: 'Dokumenty, obrázky a iné materiály, ktoré nahráte do systému.' },
                  { label: 'Dátum registrácie a aktivity', desc: 'Technické záznamy pre správu systému.' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <p className="font-semibold mb-0.5">{item.label}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                Nezbierame žiadne citlivé osobné údaje (rodné číslo, zdravotné záznamy, finančné údaje a pod.).
              </p>
            </div>
          </section>

          {/* 2. Účel spracovania */}
          <section className="card shadow-card">
            <SectionHeader icon={<Eye size={18} />} title="2. Účel a právny základ spracovania" color="purple" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Vaše údaje spracúvame výhradne za týmito účelmi:
              </p>
              <ul className="space-y-2">
                {[
                  'Poskytnutie prístupu k školskému cloudovému systému',
                  'Overenie totožnosti pri prihlásení (autentifikácia)',
                  'Zobrazenie autorov nahraných súborov spolužiakom v rovnakej triede',
                  'Správa používateľských účtov administrátorom školy',
                  'Zasielanie e-mailov súvisiacich so službou (reset hesla)',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--surface-2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: 'var(--accent-link)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <p className="font-semibold mb-0.5">Právny základ</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Spracovanie je nevyhnutné na plnenie zmluvy (poskytovanie služby) a na oprávnené
                  záujmy prevádzkovateľa (zabezpečenie bezpečnosti systému). Základom je tiež
                  súhlas používateľa vyjadrený registráciou.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Kto má prístup */}
          <section className="card shadow-card">
            <SectionHeader icon={<Lock size={18} />} title="3. Kto má prístup k vašim údajom" color="green" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <div className="space-y-2">
                {[
                  {
                    title: 'Vy sami',
                    desc: 'Vidíte vlastný profil, vlastné súbory a súbory ostatných žiakov vašej triedy (meno autora a súbor).',
                  },
                  {
                    title: 'Spolužiaci vašej triedy',
                    desc: 'Vidia vaše meno, priezvisko a súbory, ktoré ste nahrali do zdieľaného priestoru triedy.',
                  },
                  {
                    title: 'Administrátor školy',
                    desc: 'Má prístup ku všetkým profilom a súborom za účelom správy systému, schvaľovania žiakov a riešenia problémov.',
                  },
                  {
                    title: 'Supabase (infraštruktúra)',
                    desc: 'Naše dáta sú uložené na serveroch Supabase (cloud databáza a úložisko). Supabase pôsobí ako sprostredkovateľ v zmysle GDPR. Servery sa nachádzajú v EÚ (Frankfurt).',
                  },
                ].map(item => (
                  <div key={item.title} className="p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <p className="font-semibold mb-0.5">{item.title}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                Vaše údaje nepredávame, neprenajímame ani nezverejňujeme žiadnym tretím stranám na komerčné účely.
              </p>
            </div>
          </section>

          {/* 4. Cookies */}
          <section className="card shadow-card">
            <SectionHeader icon={<Cookie size={18} />} title="4. Cookies a lokálne úložisko" color="amber" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Táto aplikácia používa iba nevyhnutné technické cookies a lokálne úložisko (localStorage):
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: 'Prihlasovacia session (Supabase Auth)',
                    desc: 'Uchováva vašu prihlásenú reláciu. Bez tohto cookie sa nemôžete prihlásiť.',
                    type: 'Nevyhnutné',
                  },
                  {
                    label: 'Téma (light/dark)',
                    desc: 'Pamätá si vaše nastavenie svetlého alebo tmavého režimu v localStorage.',
                    type: 'Funkčné',
                  },
                  {
                    label: 'Súhlas s cookies',
                    desc: 'Ukladá vašu voľbu v cookie banneri (prijatý/odmietnutý) do localStorage.',
                    type: 'Nevyhnutné',
                  },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-semibold">{item.label}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(26,58,107,0.1)', color: 'var(--accent-link)' }}>
                        {item.type}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs px-1" style={{ color: 'var(--text-muted)' }}>
                Nepoužívame žiadne sledovacie, analytické ani reklamné cookies tretích strán.
              </p>
            </div>
          </section>

          {/* 5. Vaše práva */}
          <section className="card shadow-card">
            <SectionHeader icon={<ShieldCheck size={18} />} title="5. Vaše práva (GDPR)" color="blue" />
            <div className="text-sm space-y-2" style={{ color: 'var(--text)' }}>
              {[
                { right: 'Právo na prístup', desc: 'Máte právo vedieť, aké údaje o vás spracúvame.' },
                { right: 'Právo na opravu', desc: 'Môžete požiadať o opravu nesprávnych údajov (meno, trieda) prostredníctvom administrátora.' },
                { right: 'Právo na vymazanie', desc: 'Môžete požiadať o zrušenie účtu a vymazanie všetkých vašich údajov priamo v aplikácii (Môj profil → Zrušenie účtu).' },
                { right: 'Právo na prenositeľnosť', desc: 'Vaše nahrané súbory si môžete kedykoľvek stiahnuť pred zrušením účtu.' },
                { right: 'Právo namietať', desc: 'Môžete namietať voči spracovaniu vašich údajov kontaktovaním administrátora.' },
              ].map(item => (
                <div key={item.right} className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: 'var(--surface-2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                    style={{ background: 'var(--accent-link)' }} />
                  <div>
                    <p className="font-semibold">{item.right}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                </div>
              ))}
              <div className="mt-2 p-3 rounded-xl"
                style={{ background: 'rgba(26,58,107,0.06)', border: '1px solid rgba(26,58,107,0.15)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Ak sa domnievate, že vaše práva boli porušené, máte právo podať sťažnosť na{' '}
                  <strong style={{ color: 'var(--text)' }}>Úrad na ochranu osobných údajov SR</strong>{' '}
                  (dataprotection.gov.sk).
                </p>
              </div>
            </div>
          </section>

          {/* 6. Uchovávanie dát */}
          <section className="card shadow-card">
            <SectionHeader icon={<Trash2 size={18} />} title="6. Uchovávanie a mazanie údajov" color="red" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <div className="space-y-2">
                {[
                  {
                    title: 'Počas aktívneho účtu',
                    desc: 'Vaše údaje sú uchovávané po celú dobu existencie vášho účtu v systéme.',
                  },
                  {
                    title: 'Po zrušení účtu',
                    desc: 'Po schválení žiadosti o zrušenie administrátorom budú váš profil, všetky nahrané súbory a prihlasovací záznam natrvalo vymazané.',
                  },
                  {
                    title: 'Zálohy',
                    desc: 'Supabase môže uchovávať zálohy databázy krátkodobo (podľa ich vlastných zásad). Na tieto zálohy nemáme priamy vplyv.',
                  },
                ].map(item => (
                  <div key={item.title} className="p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <p className="font-semibold mb-0.5">{item.title}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 7. Kontakt */}
          <section className="card shadow-card">
            <SectionHeader icon={<Mail size={18} />} title="7. Kontakt" color="blue" />
            <div className="text-sm space-y-2" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Pri otázkach týkajúcich sa ochrany osobných údajov nás kontaktujte:
              </p>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <Mail size={14} style={{ color: 'var(--accent-link)' }} />
                <a href="mailto:ss.secovce@gmail.com" style={{ color: 'var(--accent-link)' }}>
                  ss.secovce@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <MapPin size={14} style={{ color: 'var(--accent-link)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Kollárova 17, 078 01 Sečovce, Slovensko</span>
              </div>
            </div>
          </section>

        </div>

        {/* Pätička */}
        <div className="mt-10 pt-6 text-center" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
            © 2026 RU-MONT s. r. o., Spojená škola Sečovce ·{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              Podmienky používania
            </Link>
            {' · '}
            <Link href="/" className="underline underline-offset-2 hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              Späť na prihlásenie
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ icon, title, color }) {
  const colors = {
    blue:   { bg: 'rgba(26,58,107,0.1)',   color: 'var(--accent-link)' },
    purple: { bg: 'rgba(139,92,246,0.1)',  color: '#a855f7' },
    green:  { bg: 'rgba(5,150,105,0.1)',   color: '#10b981' },
    amber:  { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
    red:    { bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
    gray:   { bg: 'rgba(107,114,128,0.1)', color: '#6b7280' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: c.bg, color: c.color }}>
        {icon}
      </div>
      <h2 className="font-bold text-base" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
        {title}
      </h2>
    </div>
  );
}
