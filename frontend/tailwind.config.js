/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Brand color: magenta #E20074. The app was built on Tailwind's `indigo`
      // as the primary accent, so we remap the whole `indigo` scale to a magenta
      // ramp (600 = #E20074, the shade used on primary buttons). Every existing
      // `indigo-*` class across the app renders magenta with no component edits.
      colors: {
        indigo: {
          50: '#FDECF6',
          100: '#FAD6EA',
          200: '#F5AED5',
          300: '#F080BA',
          400: '#EA479B',
          500: '#E72887',
          600: '#E20074',
          700: '#C00063',
          800: '#9E0051',
          900: '#7C0040',
          950: '#4F0029',
        },
      },
    },
  },
  plugins: [],
}
