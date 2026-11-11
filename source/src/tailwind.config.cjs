module.exports = {
  content: ["./ui/**/*.tsx", "../build/app.lineup.js"],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        // Lineup brand: paper, ink, electric blue, hot pink, acid yellow.
        iris: "#3355FF", mint: "#39FF6A", amber: "#EA5B0C", coral: "#FF2E93", sky: "#3355FF",
        ink: { 850: "#FFFDF6", 900: "#F3F1EA" },
      },
      fontFamily: { display: ["Anton", "Impact", "sans-serif"], sans: ['"Space Grotesk"', "system-ui", "sans-serif"], mono: ['"Space Mono"', "monospace"] },
    },
  },
};
