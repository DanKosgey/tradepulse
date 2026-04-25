/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:         '#050505',
        'bg-2':     '#0a0a0a',
        surface:    'rgba(15, 15, 15, 0.6)',
        'surface-2':'rgba(25, 25, 25, 0.7)',
        'surface-3':'rgba(35, 35, 35, 0.8)',
        'surface-4':'rgba(50, 50, 50, 0.9)',
        accent:     '#d4af37', // Formal Gold
        'accent-2': '#b8962e',
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
        'text-muted':'#9ca3af',
        'text-dim': '#6b7280',
        gold:       '#d4af37',
      },
      fontFamily: {
        mono:  ['Space Grotesk', 'monospace'],
        sans:  ['Inter', 'sans-serif'],
        body:  ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-gold':   '0 0 30px rgba(212,175,55,0.25), 0 0 60px rgba(212,175,55,0.1)',
        'glow-gold-sm':'0 0 12px rgba(212,175,55,0.3)',
        'glow-cyan':   '0 0 30px rgba(59,130,246,0.25), 0 0 60px rgba(59,130,246,0.1)',
        'glow-danger': '0 0 20px rgba(239,68,68,0.3)',
        'card':        '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card-hover':  '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.2)',
      },
      animation: {
        'pulse-slow':   'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up':     'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in':      'fadeIn 0.8s ease-out',
        'ticker':       'ticker 30s linear infinite',
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
      },
    },
  },
  plugins: [],
}
