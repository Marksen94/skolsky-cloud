/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        school: {
          navy: '#0D1F3C',
          blue: '#1A3A6B',
          accent: '#C8200A',
          accent2: '#1565C0',
          light: '#F0F4FA',
          muted: '#6B7C96',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 2px 16px rgba(13,31,60,0.08)',
        'card-hover': '0 8px 32px rgba(13,31,60,0.14)',
      },
    },
  },
  plugins: [],
};
