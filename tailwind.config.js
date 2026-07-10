/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Palette is driven by CSS variables (see index.css :root / .dark) so the
        // whole app themes via a single class toggle on <html>.
        bg: "rgb(var(--c-bg) / <alpha-value>)",
        panel: "rgb(var(--c-panel) / <alpha-value>)",
        panel2: "rgb(var(--c-panel2) / <alpha-value>)",
        line: "var(--c-line)",
        line2: "var(--c-line2)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        muted: "rgb(var(--c-muted) / <alpha-value>)",
        faint: "rgb(var(--c-faint) / <alpha-value>)",
        sol: "rgb(var(--c-sol) / <alpha-value>)",   // accent primary (blue)
        sol2: "rgb(var(--c-sol2) / <alpha-value>)",  // accent secondary (teal)
        warn: "rgb(var(--c-warn) / <alpha-value>)",
        good: "rgb(var(--c-good) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      backgroundImage: {
        "sol-gradient": "linear-gradient(97deg, #2C6ADB 0%, #2FA6A6 100%)",
      },
      borderRadius: {
        // map existing classes to the redesign's radii
        lg: "10px",   // small pills
        xl: "12px",   // buttons / inputs
        "2xl": "20px", // cards
        "3xl": "26px", // large containers (affiliate)
      },
    },
  },
  plugins: [],
};
