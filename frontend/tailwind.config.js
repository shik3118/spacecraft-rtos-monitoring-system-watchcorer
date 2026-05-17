/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      colors: {
        space: {
          950: '#05070f',
          900: '#0b1020',
          800: '#121b31',
          700: '#1b2a45',
          500: '#4c6fff'
        },
        cyanpulse: '#43e6ff',
        glow: '#88f7ff'
      },
      boxShadow: {
        glass: '0 12px 45px rgba(11,16,32,0.42)',
        glow: '0 0 0 1px rgba(136,247,255,0.22), 0 0 28px rgba(76,111,255,0.28)'
      },
      backgroundImage: {
        'aero-grid':
          'radial-gradient(circle at 1px 1px, rgba(136,247,255,0.14) 1px, transparent 0), linear-gradient(120deg, rgba(11,16,32,0.7), rgba(5,7,15,0.95))'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '0.35', transform: 'scale(0.98)' },
          '50%': { opacity: '0.95', transform: 'scale(1.02)' }
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(280%)' }
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' }
        }
      },
      animation: {
        pulseGlow: 'pulseGlow 2.8s ease-in-out infinite',
        scanline: 'scanline 7s linear infinite',
        floatSlow: 'floatSlow 5s ease-in-out infinite'
      }
    }
  },
  plugins: []
};
