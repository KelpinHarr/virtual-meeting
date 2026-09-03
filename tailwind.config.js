/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette from User:
        // #6c1a9a, #9c28ad, #ea81fb, #2856c6, #619af7, #03685c, #27a697, #141B2F
        primary: {
          50: '#f0f5ff',
          100: '#e0ecff',
          200: '#c2d8ff',
          300: '#95bcfe',
          400: '#619af7', // #619af7
          500: '#3d77e4',
          600: '#2856c6', // #2856c6 (Main Brand Blue)
          700: '#1f43a2',
          800: '#1a3783',
          900: '#172f6a',
        },
        purple: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#ea81fb', // #ea81fb (Light Purple/Pink)
          400: '#d946ef',
          500: '#c026d3',
          600: '#9c28ad', // #9c28ad (Medium Purple)
          700: '#7e1d99',
          800: '#6c1a9a', // #6c1a9a (Dark Purple)
          900: '#521277',
        },
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#27a697', // #27a697 (Teal Accent / Success)
          600: '#0d9488',
          700: '#03685c', // #03685c (Deep Teal)
          800: '#024b43',
          900: '#01332e',
        },
        navy: {
          50: '#f6f7fa',
          100: '#eaecf2',
          200: '#d3d7e5',
          300: '#adb5cf',
          400: '#7f8db3',
          500: '#5c6c97',
          600: '#46537b',
          700: '#384364',
          800: '#1c243d',
          900: '#141B2F', // #141B2F (Dark Navy Slate)
          950: '#0d1220',
        },
      },
    },
  },
  plugins: [],
};
