import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'no-restricted-imports': ['error', {
        paths: [
          { name: './utils', message: 'Importe de utils/* em vez do barrel.' },
          { name: '../utils', message: 'Importe de utils/* em vez do barrel.' },
          { name: '../../utils', message: 'Importe de utils/* em vez do barrel.' },
          { name: './utils/index', message: 'Importe de utils/* em vez do barrel.' },
          { name: '../utils/index', message: 'Importe de utils/* em vez do barrel.' },
          { name: '../../utils/index', message: 'Importe de utils/* em vez do barrel.' },
        ],
      }],
    },
  },
  {
    files: ['src/App.jsx'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['./components/*'],
            message: 'App deve importar UI via features/*, nao direto de components/*.',
          },
        ],
      }],
    },
  },
  {
    files: ['src/domain/**/*.js'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['../features/*', '../../features/*', './features/*'],
            message: 'Domain nao pode depender de features/*.',
          },
          {
            group: ['../hooks/*', '../../hooks/*', './hooks/*'],
            message: 'Domain nao pode depender de hooks/*.',
          },
        ],
      }],
    },
  },
  {
    files: ['**/*.test.{js,jsx}', '**/__tests__/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
])

