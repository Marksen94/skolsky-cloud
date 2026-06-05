'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  FileText, ArrowLeft, Mail, Calendar, ShieldCheck, AlertCircle,
  Users, Upload, Ban, Wrench, Scale, MapPin,
} from 'lucide-react';
import ThemeToggle from '@/app/components/ThemeToggle';

export default function TermsPage() {
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
              <p className="text-blue-200 text-xs">Podmienky používania</p>
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
            <FileText size={30} style={{ color: 'var(--accent-link)' }} />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: 'var(--text)' }}>
            Podmienky používania
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
            Tieto podmienky upravujú používanie školského cloudového systému prevádzkovaného
            Spojenou školou Kollárova 17, Sečovce. Používaním systému vyjadrujete súhlas
            s týmito podmienkami.
          </p>
        </div>

        <div className="space-y-6 animate-slide-up">

          {/* 1. Účel systému */}
          <section className="card shadow-card">
            <SectionHeader icon={<ShieldCheck size={18} />} title="1. Účel systému" color="blue" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Školský cloud je digitálna platforma určená výhradne pre žiakov a zamestnancov
                Spojenej školy Kollárova 17, Sečovce. Slúži na:
              </p>
              <ul className="space-y-2">
                {[
                  'Zdieľanie vzdelávacích materiálov v rámci triedy',
                  'Uchovávanie poznámok, písomiek a prezentácií',
                  'Komunikáciu medzi členmi rovnakej triedy',
                  'Prístup k školskému obsahu kedykoľvek a odkiaľkoľvek',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--surface-2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: 'var(--accent-link)' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 2. Prístup */}
          <section className="card shadow-card">
            <SectionHeader icon={<Users size={18} />} title="2. Prístup a registrácia" color="purple" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <div className="space-y-2">
                {[
                  {
                    title: 'Oprávnení používatelia',
                    desc: 'Systém je určený výhradne pre žiakov a zamestnancov školy. Registrácia cudzích osôb je zakázaná.',
                  },
                  {
                    title: 'Schvaľovanie účtov',
                    desc: 'Každý nový účet podlieha schváleniu správcom školy. Škola si vyhradzuje právo odmietnuť alebo zrušiť prístup bez udania dôvodu.',
                  },
                  {
                    title: 'Zodpovednosť za účet',
                    desc: 'Ste zodpovední za ochranu svojho hesla a za všetky aktivity uskutočnené pod vašim účtom. Zdieľanie prihlasovacích údajov je zakázané.',
                  },
                ].map((item) => (
                  <div key={item.title} className="p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                    <p className="font-semibold mb-0.5">{item.title}</p>
                    <p style={{ color: 'var(--text-muted)' }}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3. Nahrávanie obsahu */}
          <section className="card shadow-card">
            <SectionHeader icon={<Upload size={18} />} title="3. Nahrávanie obsahu" color="green" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Nahrávaním súborov do systému potvrdzujete, že:
              </p>
              <ul className="space-y-2">
                {[
                  'Máte právo daný obsah zdieľať (vaše vlastné poznámky, fotky písomiek a pod.)',
                  'Obsah nesmie porušovať autorské práva tretích strán',
                  'Obsah nesmie byť nevhodný, urážlivý alebo nebezpečný',
                  'Obsah súvisí s výučbou alebo školskými aktivitami',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--surface-2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: '#10b981' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs px-3 pt-1" style={{ color: 'var(--text-muted)' }}>
                Správca školy má právo odstrániť akýkoľvek obsah, ktorý porušuje tieto podmienky,
                bez predchádzajúceho upozornenia.
              </p>
            </div>
          </section>

          {/* 4. Zakázané činnosti */}
          <section className="card shadow-card">
            <SectionHeader icon={<Ban size={18} />} title="4. Zakázané činnosti" color="red" />
            <div className="text-sm space-y-2" style={{ color: 'var(--text)' }}>
              {[
                'Nahrávanie nevhodného, sexuálneho alebo násilného obsahu',
                'Šikanovanie, obťažovanie alebo urážanie iných používateľov',
                'Pokus o neoprávnený prístup k cudzím účtom alebo údajom',
                'Zdieľanie prihlasovacích údajov s neoprávnenými osobami',
                'Používanie systému na komerčné alebo nekomerčné mimoškolské účely',
                'Nahrávanie škodlivého softvéru alebo nebezpečných súborov',
                'Akékoľvek konanie, ktoré by mohlo ohroziť bezpečnosť systému',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--surface-2)' }}>
                  <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                    style={{ background: '#ef4444' }} />
                  <span style={{ color: 'var(--text-muted)' }}>{item}</span>
                </div>
              ))}
              <div className="mt-2 p-3 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p className="text-xs" style={{ color: '#ef4444' }}>
                  Porušenie týchto pravidiel môže viesť k okamžitému zablokovaniu účtu a ďalším
                  disciplinárnym opatreniam v súlade so školským poriadkom.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Dostupnosť */}
          <section className="card shadow-card">
            <SectionHeader icon={<Wrench size={18} />} title="5. Dostupnosť systému" color="amber" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Škola a správca systému (RU-MONT s. r. o.) sa snažia zabezpečiť nepretržitú dostupnosť
                platformy, avšak nezaručujú 100 % dostupnosť. Systém môže byť dočasne nedostupný z dôvodu:
              </p>
              <ul className="space-y-2">
                {[
                  'Plánovanej údržby alebo aktualizácií',
                  'Technickej poruchy alebo výpadku infraštruktúry',
                  'Okolností mimo kontroly prevádzkovateľa (výpadok internetu, vis maior)',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 px-3 py-2 rounded-xl"
                    style={{ background: 'var(--surface-2)' }}>
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: '#f59e0b' }} />
                    <span style={{ color: 'var(--text-muted)' }}>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Za stratu dát spôsobenú technickým zlyhaním nenesie škola ani RU-MONT s. r. o.
                zodpovednosť. Odporúčame dôležité materiály zálohovať aj lokálne.
              </p>
            </div>
          </section>

          {/* 6. Právne */}
          <section className="card shadow-card">
            <SectionHeader icon={<Scale size={18} />} title="6. Platné právo a zmeny podmienok" color="gray" />
            <div className="text-sm space-y-3" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Tieto podmienky sa riadia právnym poriadkom Slovenskej republiky.
                Všetky spory budú riešené príslušnými súdmi Slovenskej republiky.
              </p>
              <div className="p-3 rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <p className="font-semibold mb-1">Zmeny podmienok</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Prevádzkovateľ si vyhradzuje právo kedykoľvek zmeniť tieto podmienky.
                  O podstatných zmenách budú používatelia informovaní prostredníctvom systémového
                  oznámenia alebo e-mailom. Pokračovaním v používaní systému po zverejnení zmien
                  vyjadrujete súhlas s aktualizovanými podmienkami.
                </p>
              </div>
            </div>
          </section>

          {/* 7. Kontakt */}
          <section className="card shadow-card">
            <SectionHeader icon={<Mail size={18} />} title="7. Kontakt" color="blue" />
            <div className="text-sm space-y-2" style={{ color: 'var(--text)' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Pri otázkach týkajúcich sa podmienok používania nás kontaktujte:
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
            <Link href="/privacy" className="underline underline-offset-2 hover:opacity-70" style={{ color: 'var(--text-muted)' }}>
              Zásady ochrany osobných údajov
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
