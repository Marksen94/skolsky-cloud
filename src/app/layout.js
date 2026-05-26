import './globals.css';

export const metadata = {
  title: 'Spojená škola Sečovce – Školský Cloud',
  description: 'Zdieľanie poznámok a materiálov pre žiakov Spojenej školy Sečovce',
};

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="grain">
        {children}
      </body>
    </html>
  );
}
