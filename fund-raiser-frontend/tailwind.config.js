/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                'eco-green': '#2D6A4F',
                'deep-forest': '#1B4332',
                'trust-navy': '#081C15',
                'soft-sage': '#D8E2DC',
                'earth-sand': '#F4F1DE',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'eco': '0 4px 24px rgba(27, 67, 50, 0.12)',
                'eco-lg': '0 8px 40px rgba(27, 67, 50, 0.18)',
            },
            backgroundImage: {
                'eco-gradient': 'linear-gradient(135deg, #2D6A4F 0%, #1B4332 100%)',
                'forest-gradient': 'linear-gradient(180deg, #081C15 0%, #1B4332 100%)',
                'sand-gradient': 'linear-gradient(135deg, #F4F1DE 0%, #D8E2DC 100%)',
            }
        },
    },
    plugins: [],
}
