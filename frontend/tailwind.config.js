/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#4E73F8',
        'primary-container': '#4E73F8',
        'on-surface': '#1A202C',
        surface: '#F8F9FD',
        'surface-container': '#E2E8F0',
        background: '#F8F9FD',
        secondary: '#718096',
        outline: '#CBD5E0',
        'surface-container-low': '#FFFFFF',
        'surface-container-lowest': '#FFFFFF',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      fontFamily: {
        headline: ['Plus Jakarta Sans', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
