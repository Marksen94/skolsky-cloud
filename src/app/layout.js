import './globals.css';
import { ThemeProvider } from '@/lib/ThemeContext';

export const metadata = {
  title: 'Spojená škola Kollárova 17, Sečovce – Školský Cloud',
  description: 'Zdieľanie poznámok a materiálov pre žiakov Spojenej školy Sečovce',
};

export default function RootLayout({ children }) {
  return (
    <html lang="sk" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Anti-flash script – nastaví temu PRED hydratáciou */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('theme') || 'light';
              if (t === 'dark') document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        ` }} />
      </head>
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
