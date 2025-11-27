module.exports = {
  semi: true,
  singleQuote: false,
  trailingComma: "es5",
  tabWidth: 2,
  useTabs: false,
  printWidth: 100,
  arrowParens: "always",
  endOfLine: "lf",
  bracketSpacing: true,
  jsxSingleQuote: false,
  overrides: [
    {
      files: "*.json",
      options: {
        printWidth: 80,
      },
    },
    {
      files: "*.md",
      options: {
        proseWrap: "always",
      },
    },
  ],
};
