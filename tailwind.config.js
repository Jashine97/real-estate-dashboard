/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff9e6',
          100: '#fff3c4',
          200: '#ffe69c',
          300: '#ffd66f',
          400: '#ffc247',
          500: '#ffad1f',
          600: '#ff9b0a',
          700: '#e28400',
          800: '#b06702',
          900: '#71420a',
        }
      }
    },
  },
  plugins: [],
}
