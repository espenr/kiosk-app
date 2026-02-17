/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Kiosk theme colors
        primary: {
          DEFAULT: '#3182ce',
          50: '#ebf8ff',
          100: '#bee3f8',
          200: '#90cdf4',
          300: '#63b3ed',
          400: '#4299e1',
          500: '#3182ce',
          600: '#2b6cb0',
          700: '#2c5282',
          800: '#2a4365',
          900: '#1a365d',
        },
        secondary: {
          DEFAULT: '#805ad5',
          50: '#faf5ff',
          100: '#e9d8fd',
          200: '#d6bcfa',
          300: '#b794f4',
          400: '#9f7aea',
          500: '#805ad5',
          600: '#6b46c1',
          700: '#553c9a',
          800: '#44337a',
          900: '#322659',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        'kiosk-xs': '0.75rem',
        'kiosk-sm': '0.875rem',
        'kiosk-base': '1rem',
        'kiosk-lg': '1.125rem',
        'kiosk-xl': '1.25rem',
        'kiosk-2xl': '1.5rem',
        'kiosk-3xl': '1.875rem',
        'kiosk-4xl': '2.25rem',
        'kiosk-5xl': '3rem',
      },
      spacing: {
        'grid-gap': '0.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-out-right': 'slideOutRight 0.3s ease-in',
        'photo-fade-in': 'photoFadeIn 1.5s ease-out forwards',
        'photo-fade-out': 'photoFadeOut 1.5s ease-in forwards',
        'ken-burns': 'kenBurns 30s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        photoFadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        photoFadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        kenBurns: {
          '0%': { transform: 'var(--kb-from, scale(1))' },
          '100%': { transform: 'var(--kb-to, scale(1.08))' },
        },
      },
    },
  },
  plugins: [],
  // Ensure compatibility with Chakra UI during transition
  corePlugins: {
    preflight: false, // Disable Tailwind's reset to avoid conflicts with Chakra
  },
}
