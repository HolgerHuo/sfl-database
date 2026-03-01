/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#e11d48',
          600: '#8f000b',
          700: '#7f000a',
          800: '#6f0009',
          900: '#5f0007',
          950: '#450005',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
