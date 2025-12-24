import type { Config } from "tailwindcss";

// all in fixtures is set to tailwind v3 as interims solutions

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: '#111827', // gray-900
        foreground: '#ffffff', // white
        card: {
          DEFAULT: '#111827', // gray-900
          foreground: '#ffffff'
        },
        popover: {
          DEFAULT: '#111827', // gray-900
          foreground: '#ffffff'
        },
        primary: {
          DEFAULT: '#2563eb', // blue-600
          foreground: '#ffffff'
        },
        secondary: {
          DEFAULT: '#1f2937', // gray-800
          foreground: '#d1d5db' // gray-300
        },
        muted: {
          DEFAULT: '#1f2937', // gray-800
          foreground: '#9ca3af' // gray-400
        },
        accent: {
          DEFAULT: '#1f2937', // gray-800
          foreground: '#ffffff'
        },
        destructive: {
          DEFAULT: '#ef4444', // red-500
          foreground: '#ffffff'
        },
        border: '#1f2937', // gray-800
        input: '#1f2937', // gray-800
        ring: '#3b82f6', // blue-500
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        sidebar: {
          DEFAULT: '#111827', // gray-900
          foreground: '#d1d5db', // gray-300
          border: '#1f2937', // gray-800
          accent: '#2563eb', // blue-600
          'accent-foreground': '#ffffff',
          ring: '#3b82f6'
        }
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
        xl: '20px',
        full: '50%'
      },
      fontFamily: {
        sans: ['var(--font-poppins)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #ff6b35 0%, #ff8f00 100%)',
        'secondary-gradient': 'linear-gradient(135deg, #ffd23f 0%, #ffeb3b 100%)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'slide-in-right': {
          from: {
            transform: 'translateX(100%)',
            opacity: '0',
          },
          to: {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        'slide-out-left': {
          from: {
            transform: 'translateX(0)',
            opacity: '1',
          },
          to: {
            transform: 'translateX(-100%)',
            opacity: '0',
          },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pop-in': {
          '0%': {
            transform: 'scale(0)',
            opacity: '0',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'slide-out-left': 'slide-out-left 0.4s ease-in',
        'spin': 'spin 1s linear infinite',
        'pop-in': 'pop-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
