import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
        status: {
          green: "#10B981",
          "green-bg": "#ECFDF5",
          yellow: "#F59E0B",
          "yellow-bg": "#FFFBEB",
          orange: "#F97316",
          "orange-bg": "#FFF7ED",
          red: "#EF4444",
          "red-bg": "#FEF2F2",
          blue: "#3B82F6",
          "blue-bg": "#EFF6FF",
        },
      },
    },
  },
  plugins: [],
};
export default config;
