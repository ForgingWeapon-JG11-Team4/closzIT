/** @type {import('tailwindcss').Config} */
module.exports = {
  // 1. Tailwind를 적용할 파일 경로 설정 (중요!)
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#8B5CF6", // Violet-500 (New Primary)
        "primary-old": "#22c55e", // CloszIT Green (Legacy)
        "brand-blue": "#3B82F6", // Step 2 Blue
        "brand-purple": "#8B5CF6", // Violet-500
        "brand-purple-dark": "#7C3AED", // Violet-600
        "secondary": "#10B981",
        "background-light": "#f9fafb",
        "background-dark": "#111827",
        "surface-light": "#ffffff",
        "surface-dark": "#1f2937",
        "border-light": "#e5e7eb",
        "border-dark": "#374151",
        "text-light": "#1f2937",
        "text-dark": "#f3f4f6",
        "text-muted-light": "#6b7280",
        "text-muted-dark": "#9ca3af",
        "input-bg-light": "#F3F4F6",
        "input-bg-dark": "#374151",
        "divider-light": "#E5E7EB",
        "divider-dark": "#374151",
      },
      fontFamily: {
        display: ["'Noto Sans KR'", "sans-serif"],
        sans: ["'Noto Sans KR'", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.75rem",
        'xl': '1rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [],
}