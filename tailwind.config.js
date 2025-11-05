/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // use class-based dark mode to allow explicit user toggle (Light/Dark/System)
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // map Tailwind tokens to CSS variables defined in src/index.css
        'app-bg': 'var(--bg)',
        'app-bg-2': 'var(--bg-2)',
        'card': 'var(--card-bg)',
        'panel': 'var(--panel-bg)',
        'text': 'var(--text)',
        'muted': 'var(--muted)',
        'border-var': 'var(--border)',
        'accent': 'var(--accent)',
        'accent-2': 'var(--accent-2)',
        // semantic status colors
        'danger': 'var(--danger)',
        'danger-2': 'var(--danger-2)',
        'warning': 'var(--warning)',
        'warning-2': 'var(--warning-2)',
        'success': 'var(--success)',
        'success-2': 'var(--success-2)',
        'info': 'var(--info)',
        'info-2': 'var(--info-2)'
      }
    },
  },
  plugins: [],
}
