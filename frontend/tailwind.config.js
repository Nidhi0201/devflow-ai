/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      colors: {
        water: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
        mist: {
          DEFAULT: "#f8fafc",
          soft: "#f1f5f9",
          card: "rgba(255,255,255,0.72)",
          border: "rgba(148,163,184,0.25)",
        },
      },
      borderRadius: {
        droplet: "2rem",
        blob: "3rem",
      },
      boxShadow: {
        droplet: "0 8px 32px rgba(14,165,233,0.08), 0 2px 8px rgba(14,165,233,0.04)",
        float: "0 20px 60px rgba(14,165,233,0.12)",
      },
      backgroundImage: {
        "water-gradient": "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdfa 100%)",
        "water-shine": "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(56,189,248,0.18), transparent)",
      },
    },
  },
  plugins: [],
};
