/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          950: '#f8fbff',
          900: '#eef5ff',
          800: '#e2ecff',
          700: '#d3e3fb',
          600: '#b6cde9',
        },
        accent: {
          50: '#eef9ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      boxShadow: {
        glow: '0 14px 34px rgba(56, 189, 248, 0.16)',
      },
      backgroundImage: {
        app: 'radial-gradient(circle at top, rgba(56,189,248,.20), transparent 38%), linear-gradient(180deg, #f8fbff 0%, #eef5ff 100%)',
      },
    },
  },
  plugins: [],
}
