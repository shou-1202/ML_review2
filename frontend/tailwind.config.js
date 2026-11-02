/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // --- Shako palette -------------------------------------------------
        snow: "#F5F8FA", //          page base
        frost: "#DCEFFA", //         pale glacier blue: alternate bands, chips
        midnight: "#071522", //      heroes, footer, deep panels
        navy: { DEFAULT: "#102B45", soft: "#1B3D5E" },
        cyan: { DEFAULT: "#55B9E8", ink: "#1C7DB4" }, //   glacier cyan (ink = text on light)
        ice: "#A9D9F3",
        coral: { DEFAULT: "#FF694F", ink: "#D4442B", soft: "#FFE6E0" },
        silver: "#CDD9E1",

        // --- semantic aliases used across the step panels -------------------
        bg: "#F5F8FA",
        surface: "#FFFFFF",
        raised: "#EDF5FA",
        border: "#D5E1E9",
        ink: "#0C2235",
        muted: "#4A6274",
        faint: "#8398A9",
        amber: { DEFAULT: "#D4442B", dim: "#F3B3A6" }, //  "attention" = coral ink on light
        teal: { DEFAULT: "#1C7DB4", dim: "#A9D9F3" }, //    "secondary" = cyan ink on light
        danger: "#C2382A",

        // Classification classes — the notebooks' hues (Glacier grey, Glacial
        // Lake blue, Non-Glacier Land brown), tuned for a light background.
        glacier: "#8A9095",
        lake: "#1F78C8",
        land: "#A0582A",
      },
      fontFamily: {
        serif: ["'Cormorant Garamond'", "Georgia", "serif"],
        sans: ["'Manrope Variable'", "'Manrope'", "system-ui", "sans-serif"],
        mono: ["'DM Mono'", "ui-monospace", "monospace"],
      },
      fontSize: {
        // modular scale (1.25) for body; display sizes are fluid
        "display-xl": ["clamp(2.3rem, 8.4vw, 8.75rem)", { lineHeight: "0.9", letterSpacing: "-0.01em" }],
        "display-lg": ["clamp(2.9rem, 6.2vw, 6.5rem)", { lineHeight: "0.92", letterSpacing: "-0.005em" }],
        "display-md": ["clamp(2.25rem, 4.2vw, 4rem)", { lineHeight: "1", letterSpacing: "-0.005em" }],
        "display-sm": ["clamp(1.75rem, 2.6vw, 2.5rem)", { lineHeight: "1.08" }],
      },
      borderRadius: {
        sm: "2px",
        DEFAULT: "3px",
        md: "4px",
      },
      maxWidth: {
        page: "82rem",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(7,21,34,0.06), 0 8px 28px -12px rgba(7,21,34,0.18)",
        lift: "0 24px 60px -28px rgba(7,21,34,0.55)",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(250%)" },
        },
      },
      animation: {
        scan: "scan 1.6s cubic-bezier(.4,0,.2,1) infinite",
      },
    },
  },
  plugins: [],
};
