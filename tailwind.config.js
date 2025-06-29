/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        doppel: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          accent: '#06b6d4',
          background: 'rgba(0, 0, 0, 0.8)',
          surface: 'rgba(255, 255, 255, 0.1)',
          text: '#ffffff',
          'text-secondary': 'rgba(255, 255, 255, 0.7)',
        }
      },
      animation: {
        'breathe': 'breathe 3s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'glow': 'glow 4s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': {
            transform: 'scale(1)',
            opacity: '0.8'
          },
          '50%': {
            transform: 'scale(1.1)',
            opacity: '1'
          }
        },
        'pulse-glow': {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.5)'
          },
          '50%': {
            boxShadow: '0 0 30px rgba(99, 102, 241, 0.8)'
          }
        },
        glow: {
          '0%, 100%': {
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)'
          },
          '50%': {
            background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)'
          }
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)'
          },
          '50%': {
            transform: 'translateY(-10px)'
          }
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 