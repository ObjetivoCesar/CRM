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
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)'
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)'
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)'
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        brand: {
          // Aqua (nueva paleta Glassmorphism)
          aqua:           'var(--brand-aqua)',
          'aqua-light':   'var(--brand-aqua-light)',
          'aqua-subtle':  'var(--brand-aqua-subtle)',
          'aqua-border':  'var(--brand-aqua-border)',
          'aqua-glow':    'var(--brand-aqua-glow)',
          'aqua-muted':   'var(--brand-aqua-muted)',
          // Aliases para compatibilidad con componentes que usaban 'purple'
          purple:         'var(--brand-aqua)',
          'purple-light': 'var(--brand-aqua-light)',
          'purple-subtle':'var(--brand-aqua-subtle)',
          'purple-border':'var(--brand-aqua-border)',
          'purple-glow':  'var(--brand-aqua-glow)',
          'purple-muted': 'var(--brand-aqua-muted)',
          star:           'var(--brand-star)',
        },
        signal: {
          urgent:  'var(--signal-urgent)',
          'urgent-subtle': 'var(--signal-urgent-subtle)',
          warn:    'var(--signal-warn)',
          'warn-subtle': 'var(--signal-warn-subtle)',
          success: 'var(--signal-success)',
          'success-subtle': 'var(--signal-success-subtle)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)'
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
        sans:    ['var(--font-jakarta)', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        card:         '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.06)',
        elevated:     '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,194,224,0.12)',
        subtle:       '0 1px 2px rgba(0,0,0,0.3)',
        'glow-aqua':  '0 0 20px rgba(0,194,224,0.4), 0 0 60px rgba(0,194,224,0.10)',
        'glow-purple':'0 0 20px rgba(0,194,224,0.4), 0 0 60px rgba(0,194,224,0.10)',
        'glow-subtle':'0 0 8px rgba(0,194,224,0.20)',
        'glass':      '0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
      },
      backgroundImage: {
        'aqua-fade':      'linear-gradient(180deg, #00C2E0 0%, transparent 80%)',
        'aqua-radial':    'radial-gradient(ellipse at top, rgba(0,194,224,0.15) 0%, transparent 70%)',
        'purple-fade':    'linear-gradient(180deg, #00C2E0 0%, transparent 80%)',
        'purple-radial':  'radial-gradient(ellipse at top, rgba(0,194,224,0.15) 0%, transparent 70%)',
        'dark-gradient':  'linear-gradient(135deg, #0A1628 0%, #050D1A 100%)',
        'navy-mesh':      'radial-gradient(ellipse 80% 60% at 20% 10%, rgba(0,100,180,0.25) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 80% 30%, rgba(0,194,224,0.12) 0%, transparent 55%)',
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
