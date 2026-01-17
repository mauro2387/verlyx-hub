/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        custom: {
          'blue': '#64D4F5',
        }
      }
    },
  },
  safelist: [
    'bg-[#64D4F5]',
    'text-[#64D4F5]',
    'border-[#64D4F5]',
  ],
  plugins: [],
}