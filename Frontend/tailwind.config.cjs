/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx,css}"],
  theme: {
    extend: {
      shadow: {
        soft: "0 10px 30px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};
