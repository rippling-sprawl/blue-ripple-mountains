import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          base: "#121212",
          surface: "#1e1e1e",
          raised: "#262626",
        },
        accent: {
          DEFAULT: "#f5a623",
          muted: "#b3791a",
        },
        ink: {
          DEFAULT: "#f5f5f5",
          muted: "#a0a0a0",
          dim: "#6b6b6b",
        },
        line: "#2a2a2a",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
