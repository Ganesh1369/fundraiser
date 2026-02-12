/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/**/*.{html,ts}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#3ec194',
                    50: '#f0fdf8',
                    100: '#d9f9ec',
                    200: '#b0f2d8',
                    300: '#7ae6be',
                    400: '#3ec194',
                    500: '#26a87e',
                    600: '#1a8966',
                    700: '#176d53',
                    800: '#155743',
                    900: '#134838',
                },
                accent: {
                    DEFAULT: '#2b276b',
                    50: '#f0f0fb',
                    100: '#dddcf4',
                    200: '#bfbdeb',
                    300: '#9895dd',
                    400: '#7570cc',
                    500: '#5b55b8',
                    600: '#4a439e',
                    700: '#3d3780',
                    800: '#2b276b',
                    900: '#1f1c52',
                },
                neutral: {
                    50: '#fafafa',
                    100: '#f5f5f5',
                    200: '#e5e5e5',
                    300: '#d4d4d4',
                    400: '#a3a3a3',
                    500: '#737373',
                    600: '#525252',
                    700: '#404040',
                    800: '#262626',
                    900: '#171717',
                },
            },
            fontFamily: {
                sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
            },
            borderRadius: {
                '4xl': '2rem',
            },
            boxShadow: {
                'soft': '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
                'card': '0 4px 16px rgba(0,0,0,0.06)',
                'elevated': '0 12px 40px rgba(0,0,0,0.08)',
                'modal': '0 20px 60px rgba(0,0,0,0.12)',
            },
        },
    },
    plugins: [],
}
