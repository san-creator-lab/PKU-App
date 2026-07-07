/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0A1220',
          900: '#0F1B2D',
          800: '#16263D',
          700: '#1F3350',
          600: '#2A4166',
          500: '#365380',
        },
        electric: {
          300: '#7DE9FF',
          400: '#33DDFF',
          500: '#00D4FF',
          600: '#00A8CC',
          700: '#007D99',
        },
        gold: {
          300: '#FFEB80',
          400: '#FFE14D',
          500: '#FFD700',
          600: '#D4AF00',
        },
        hero: {
          400: '#FF6B6B',
          500: '#FF3B3B',
          600: '#D42B2B',
        },
        power: {
          green: '#2EE66B',
          yellow: '#FFC93C',
          red: '#FF5D5D',
        },
      },
      fontFamily: {
        display: ['Fredoka', 'Nunito', 'system-ui', 'sans-serif'],
        body: ['Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        hero: '20px',
        card: '24px',
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 212, 255, 0.35)',
        'glow-gold': '0 0 24px rgba(255, 215, 0, 0.35)',
        'glow-soft': '0 0 12px rgba(0, 212, 255, 0.2)',
        card: '0 8px 24px rgba(0, 0, 0, 0.35)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(255, 201, 60, 0.25)' },
          '50%': { boxShadow: '0 0 28px rgba(255, 201, 60, 0.55)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        sparkle: {
          '0%, 100%': { opacity: '0.2', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.15)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 1.6s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        sparkle: 'sparkle 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
