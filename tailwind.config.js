/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5',
          50: '#EBEAFD',
          100: '#D7D5FB',
          200: '#AEAAF7',
          300: '#867FF3',
          400: '#5D54EF',
          500: '#4F46E5',
          600: '#2D23D0',
          700: '#221B9E',
          800: '#17136C',
          900: '#0C0B3A',
        },
        secondary: {
          DEFAULT: '#14B8A6',
          50: '#E6FAF8',
          100: '#CDF5F1',
          200: '#9CEBE3',
          300: '#6AE1D5',
          400: '#39D7C7',
          500: '#14B8A6',
          600: '#108F82',
          700: '#0C665D',
          800: '#083D38',
          900: '#041413',
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
      },
      animation: {
        'gradient': 'gradient 15s ease infinite',
      },
      keyframes: {
        gradient: {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center',
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center',
          },
        },
      },
    },
  },
  plugins: [],
};