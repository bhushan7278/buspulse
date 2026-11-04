/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Core Theme Palette
        'flame-coral': '#F35E3E',
        'midnight-plum': '#3B2E40',
        'periwinkle': '#6173F4',
        'shell': '#FCEFED',

        // Semantic Palette Aliases
        brand: {
          coral: '#F35E3E',
          plum: '#3B2E40',
          periwinkle: '#6173F4',
          shell: '#FCEFED'
        },

        // Surface & depth variants for Midnight Plum
        plum: {
          dark: '#2A202E',
          base: '#3B2E40',
          elevated: '#4A3A50',
          border: '#5C4863'
        },

        // Backward-compatible brand mappings redirected to new theme
        'brand-bg': '#3B2E40',
        'brand-secondary': '#2A202E',
        'brand-card': '#FCEFED',
        'brand-accent': '#F35E3E',
        'brand-accent-hover': '#E04D2E',
        'brand-light': '#6173F4',
        'brand-text': '#FCEFED'
      },
      boxShadow: {
        soft: '0 24px 60px rgba(59, 46, 64, 0.35)',
        card: '0 20px 40px -15px rgba(59, 46, 64, 0.25)'
      }
    }
  },
  plugins: []
}
