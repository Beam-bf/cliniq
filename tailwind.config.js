/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: { 50: '#f5f2ea', 100: '#eeece3', 200: '#d3d0c5', 300: '#b7b8ab', 400: '#777d70', 500: '#62665d', 600: '#555b50', 700: '#444b41', 800: '#333a31', 900: '#292c28' },
        teal: { 50: '#e6e9df', 100: '#d9e3da', 600: '#356b58', 700: '#285447', 800: '#21483b', 900: '#1b3d32' },
      },
    },
  },
  plugins: [],
};
