import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "vw-bg": "#0b0715",
                "vw-surface": "#130a26",
                "vw-accent": "#FF7A00",
                "vw-accent-soft": "#FFC332",
                "vw-text": "#F3EEFF",
                "vw-muted": "#A89BC9",
            },
            fontFamily: {
                sans: ["Outfit", "system-ui", "sans-serif"],
            },
        },
    },
    plugins: [],
};

export default config;
