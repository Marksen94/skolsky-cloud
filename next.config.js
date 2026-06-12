/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        // Wildcard pokrýva všetky Supabase projekty — pre väčšiu bezpečnosť
        // zmeň na konkrétny hostname tvojho projektu, napr.:
        // hostname: 'abcdefghijklm.supabase.co'
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
