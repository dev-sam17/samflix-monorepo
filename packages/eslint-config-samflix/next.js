module.exports = {
  extends: ["next/core-web-vitals", "./index.js"],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  plugins: ["react", "react-hooks"],
  rules: {
    "react/react-in-jsx-scope": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
};
