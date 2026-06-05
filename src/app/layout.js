import './globals.css';
import { ThemeProvider } from '@/lib/ThemeContext';
import CookieBanner from '@/app/components/CookieBanner';
import SummerNotification from '@/app/components/SummerNotification';

export const metadata = {
  title: 'Spojená škola Kollárova 17, Sečovce – Cloud pre žiakov',
  description: 'Cloudové úloziško pre žiakov Spojenej školy Kollárova 17, Sečovce',
};

export default function RootLayout({ children }) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Anti-flash script – nastaví tému PRED hydratáciou.
            Priorita: 1. uložená voľba v localStorage
                      2. systémové nastavenie (prefers-color-scheme)
                      3. svetlý režim ako záloha */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var saved = localStorage.getItem('theme');
              var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              var theme = saved ? saved : (prefersDark ? 'dark' : 'light');
              if (theme === 'dark') document.documentElement.classList.add('dark');
              // Ulož do localStorage ak ešte nebolo nastavené, aby ThemeContext
              // vedel čo je aktívne hneď po mountnutí
              if (!saved) localStorage.setItem('theme', theme);
            } catch(e) {}
          })();
        ` }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <SummerNotification />
          <CookieBanner />
        </ThemeProvider>
      </body>
    </html>
  );
}
