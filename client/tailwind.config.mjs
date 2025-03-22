/** @type {import('tailwindcss').Config} */

const colors = require("tailwindcss/colors");
const {
	default: flattenColorPalette,
} = require("tailwindcss/lib/util/flattenColorPalette");

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))',
				},
				primary: {
					DEFAULT: '#00A86B',
					foreground: 'hsl(var(--primary-foreground))',
					100: '#E3FCEF',
					200: '#B8F5D5',
					300: '#8CEBBC',
					400: '#61E1A2',
					500: '#00A86B',
					600: '#008857',
					700: '#006644',
					800: '#00442F',
					900: '#00221A',
				},
				secondary: {
					DEFAULT: '#FFFFFF',
					foreground: 'hsl(var(--secondary-foreground))',
					100: '#FFFFFF',
					200: '#F8F8F8',
					300: '#F2F2F2',
					400: '#EAEAEA',
					500: '#E0E0E0',
					600: '#C0C0C0',
					700: '#A0A0A0',
					800: '#808080',
					900: '#606060',
				},
				'dark-primary': {
					DEFAULT: '#4CD797',
					foreground: 'hsl(var(--primary-foreground))',
					100: '#E6FAF2',
					200: '#C1F5DE',
					300: '#9CF0CA',
					400: '#77EAB6',
					500: '#4CD797',
					600: '#3AA97A',
					700: '#287B5C',
					800: '#18543D',
					900: '#0C2B1F',
				},
				'dark-secondary': {
					DEFAULT: '#121212',
					foreground: 'hsl(var(--secondary-foreground))',
					100: '#292929',
					200: '#232323',
					300: '#1E1E1E',
					400: '#181818',
					500: '#121212',
					600: '#0E0E0E',
					700: '#0A0A0A',
					800: '#060606',
					900: '#020202',
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
			},
		},
	},
	plugins: [require("tailwindcss-animate"), addVariablesForColors],
};

function addVariablesForColors({ addBase, theme }) {
	let allColors = flattenColorPalette(theme("colors"));
	let newVars = Object.fromEntries(
		Object.entries(allColors).map(([key, val]) => [`--${key}`, val])
	);

	addBase({
		":root": newVars,
	});
}
