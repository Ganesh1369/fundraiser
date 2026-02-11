/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                'eco-green': '#21BF99', // Teal Green
                'deep-forest': '#191970', // Midnight Blue
                'trust-navy': '#191970', // Midnight Blue
                'light-sage': '#BADAD4', // Soft Teal
                'soft-sage': '#D4FBF2', // Mint/Aqua
                'earth-sand': '#191970', // Midnight Blue (User override)
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'eco': '0 4px 24px rgba(33, 191, 153, 0.12)',
                'eco-lg': '0 8px 40px rgba(33, 191, 153, 0.18)',
                'eco-glow': '0 4px 20px rgba(33, 191, 153, 0.25)',
            },
            backgroundImage: {
                'eco-gradient': 'linear-gradient(135deg, #21BF99 0%, #BADAD4 100%)',
                'forest-gradient': 'linear-gradient(180deg, #191970 0%, #191970 100%)',
                'sand-gradient': 'linear-gradient(135deg, #89645F 0%, #E2B0A1 100%)',
                'hero-gradient': 'linear-gradient(135deg, #21BF99 0%, #BADAD4 100%)',
            }
        },
    },
    plugins: [],
}
