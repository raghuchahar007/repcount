import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0a',
          card: '#111111',
          hover: '#1a1a1a',
        },
        accent: {
          orange: '#ff6b35',
          'orange-dark': '#e55a2b',
        },
        status: {
          green: '#4ade80',
          red: '#ef4444',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          purple: '#a855f7',
        },
        text: {
          primary: '#ffffff',
          secondary: '#999999',
          muted: '#555555',
        },
        border: {
          DEFAULT: '#1a1a1a',
          light: '#222222',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      maxWidth: {
        'mobile': '480px',
      }
    },
  },
  plugins: [],
}
export default config
