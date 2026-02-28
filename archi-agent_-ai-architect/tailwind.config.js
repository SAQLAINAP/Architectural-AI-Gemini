/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './*.{tsx,ts}',
    './components/**/*.{tsx,ts}',
    './views/**/*.{tsx,ts}',
    './contexts/**/*.{tsx,ts}',
    './services/**/*.{tsx,ts}',
    './lib/**/*.{tsx,ts}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        neo: {
          bg: '#fdfcdc',
          primary: '#a388ee',
          secondary: '#ff90e8',
          accent: '#2cd4bf',
          dark: '#1f2937',
        },
      },
      boxShadow: {
        neo: '4px 4px 0px 0px rgba(0,0,0,1)',
        neoDark: '4px 4px 0px 0px rgba(255,255,255,1)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
