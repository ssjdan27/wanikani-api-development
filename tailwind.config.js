/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'wanikani': {
          // WaniKani brand colors
          'radical': '#00aaff',
          'kanji': '#ff00aa',
          'vocabulary': '#aa00ff',
          // Light theme
          'bg': '#f5f5f5',
          'bg-dark': '#1a1a2e',
          'card': '#ffffff',
          'card-dark': '#16213e',
          'border': '#e5e5e5',
          'border-dark': '#2a2a4a',
          'text': '#333333',
          'text-dark': '#e8e8e8',
          'text-light': '#666666',
          'text-light-dark': '#a0a0a0',
          // Accent colors
          'pink': '#ff00aa',
          'cyan': '#00aaff',
          'green': '#88cc00',
          // SRS stage colors
          'apprentice': '#dd0093',
          'guru': '#882d9e',
          'master': '#294ddb',
          'enlightened': '#0093dd',
          'burned': '#434343',
        }
      },
      fontFamily: {
        'japanese': ['Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'card-dark': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'card-hover-dark': '0 4px 12px rgba(0, 0, 0, 0.4)',
      },
    },
  },
  plugins: [],
}
