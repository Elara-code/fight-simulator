/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#FF4D6D',
        accent: '#FFB703',
        ai: '#00E5FF',
        bg: '#0B0F14',
        card: '#141922',
        muted: '#8A94A6',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
        heavy: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        num: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 10px 40px -10px rgba(255,77,109,0.55)',
        glowOrange: '0 10px 40px -10px rgba(255,183,3,0.55)',
        card: '0 8px 24px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        'grid-dark':
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        'cta-gradient':
          'linear-gradient(90deg, #FF4D6D 0%, #FF6B3D 50%, #FFB703 100%)',
        'share-gradient':
          'linear-gradient(90deg, #A855F7 0%, #6366F1 50%, #00E5FF 100%)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'translateY(20px) scale(0.96)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,77,109,0.6)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255,77,109,0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        pop: 'pop 320ms cubic-bezier(0.22,1,0.36,1) both',
        shake: 'shake 180ms ease-in-out',
        pulseGlow: 'pulseGlow 2s ease-out infinite',
        float: 'float 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
