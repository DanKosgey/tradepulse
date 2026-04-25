/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:         '#080f0c',
        'bg-2':     '#0d1a12',
        surface:    'rgba(5, 20, 12, 0.65)',
        'surface-2':'rgba(8, 28, 16, 0.75)',
        'surface-3':'rgba(12, 35, 20, 0.85)',
        'surface-4':'rgba(18, 45, 28, 0.92)',
        accent:     '#00C880', // Mint/Emerald Green
        'accent-2': '#00A86B',
        cyan:       '#3b82f6', // Professional blue
        'cyan-2':   '#2563eb',
        purple:     '#6366f1',
        'purple-2': '#4f46e5',
        danger:     '#ef4444',
        'danger-2': '#dc2626',
        warning:    '#f59e0b',
        'warning-2':'#d97706',
        muted:      '#4b5563',
        'text-dark': '#ffffff',
        'text-muted':'#a3b3ab',
        'text-dim': '#718a7e',
        gold:       '#00C880',
      },
      fontFamily: {
        mono:  ['Space Grotesk', 'monospace'],
        sans:  ['Inter', 'sans-serif'],
        body:  ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-gold':   '0 0 30px rgba(0,200,128,0.25), 0 0 60px rgba(0,200,128,0.1)',
        'glow-gold-sm':'0 0 12px rgba(0,200,128,0.3)',
        'glow-cyan':   '0 0 30px rgba(59,130,246,0.25), 0 0 60px rgba(59,130,246,0.1)',
        'glow-danger': '0 0 20px rgba(239,68,68,0.3)',
        'card':        '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover':  '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,200,128,0.2)',
      },
      animation: {
        'pulse-slow':   'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up':     'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':      'fadeIn 0.8s ease-out',
        'ticker':       'ticker 30s linear infinite',
        'ambient':      'ambientPulse 8s ease-in-out infinite alternate',
        'border-glow':  'borderGlow 5s ease-in-out infinite',
        'neon-flicker': 'neonFlicker 6s infinite',
      },
      keyframes: {
        slideUp: {
          '0%':   { transform: 'translateY(30px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          '0%':   { opacity: 0 },
          '100%': { opacity: 1 },
        },
        ticker: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        ambientPulse: {
          '0%':   { opacity: '0.7', transform: 'translateX(-50%) scale(1)' },
          '100%': { opacity: '1',   transform: 'translateX(-50%) scale(1.1)' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(0,200,128,0.2)', boxShadow: '0 0 8px rgba(0,200,128,0.1)' },
          '50%':      { borderColor: 'rgba(0,200,128,0.5)', boxShadow: '0 0 20px rgba(0,200,128,0.25)' },
        },
        neonFlicker: {
          '0%, 95%, 100%': { opacity: '1' },
          '96%':           { opacity: '0.85' },
          '98%':           { opacity: '0.92' },
        },
      },
    },
  },
  plugins: [],
}
