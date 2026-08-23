/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 1px 2px 0 rgba(28,25,23,0.04), 0 1px 3px 0 rgba(28,25,23,0.06)',
        elevated: '0 4px 10px -2px rgba(28,25,23,0.10), 0 2px 6px -2px rgba(28,25,23,0.06)',
        popover: '0 12px 32px -8px rgba(28,25,23,0.18), 0 4px 12px -4px rgba(28,25,23,0.10)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        toastIn: {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.96)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        toastOut: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)', maxHeight: '80px' },
          '100%': { opacity: '0', transform: 'translateY(-4px) scale(0.98)', maxHeight: '0px' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out both',
        'fade-in-up': 'fadeInUp 0.32s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scaleIn 0.18s cubic-bezier(0.16,1,0.3,1) both',
        'slide-down': 'slideDown 0.2s ease-out both',
        'toast-in': 'toastIn 0.22s cubic-bezier(0.16,1,0.3,1) both',
        'toast-out': 'toastOut 0.18s ease-in forwards',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
};
