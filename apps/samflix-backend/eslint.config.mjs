import createConfig from '@samflix/eslint-config';
import globals from 'globals';

export default [
  ...createConfig({
    tsconfigRootDir: import.meta.dirname,
    ignores: ['*.config.js'],
  }),
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
  },
];
