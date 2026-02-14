/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                keenan: {
                    gold: '#C59D5F',
                    dark: '#1A1A1A',
                    cream: '#FFF8E7',
                    white: '#FFFFFF',
                    gray: '#F5F5F5'
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
            }
        },
    },
    plugins: [],
}