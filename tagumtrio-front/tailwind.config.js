/** @type {import('tailwindcss').Config} */
export default {
	content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {
			fontFamily: {
				sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				heading: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
			},
			colors: {
				forest: {
					DEFAULT: '#06402B',
					hover: '#0B5A3D',
					active: '#043420',
				},
			},
			boxShadow: {
				glow: '0 0 40px rgba(16, 185, 129, 0.18)',
			},
		},
	},
	plugins: [],
};
