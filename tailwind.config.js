/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'wanikani': {
          'radical': '#00aaff',
          'kanji': '#ff00aa',
          'vocabulary': '#aa00ff',
          'dark': '#1a1f2e',
          'darker': '#161923',
        }
      },
      fontFamily: {
        'japanese': ['Hiragino Sans', 'Yu Gothic', 'Meiryo', 'Takao', 'IPAexGothic', 'IPAPGothic', 'VL PGothic', 'Noto Sans CJK JP', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
