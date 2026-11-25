// Configuração do ESLint (flat config).
import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import { defineConfig } from 'eslint/config'
import ts from 'typescript-eslint'

/** Mensagem padrão para as regras de arquitetura (dependências apontam para dentro). */
const layer = (name) => `Arquitetura limpa: ${name} (ver CLAUDE.md, seção "Arquitetura").`

/** Proíbe importar pacotes do monorepo, menos os liberados em `allowed`. */
const onlyImports = (allowed, message) => ({
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        {
          group: ['@magnifier-cases/*', ...allowed.map((name) => `!@magnifier-cases/${name}`)],
          message: layer(message),
        },
        {
          group: ['node:*', 'cloudflare:*'],
          message: layer('pacotes puros não usam APIs do Node nem da Cloudflare'),
        },
      ],
    },
  ],
})

/**
 * Pureza: sem sorteio fora do PRNG com semente, sem relógio, sem I/O e sem log (um log pode
 * vazar a solução). Vale para o motor, o conteúdo, os bots e o kit.
 */
const purity = {
  'no-console': 'error',
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Use o PRNG com semente (nunca Math.random).' },
    { object: 'Date', property: 'now', message: 'Funções puras recebem o tempo por parâmetro.' },
  ],
  'no-restricted-globals': [
    'error',
    ...['window', 'document', 'navigator', 'localStorage', 'sessionStorage', 'fetch', 'crypto'].map(
      (name) => ({ name, message: 'Pacote puro: sem APIs de navegador ou de rede.' }),
    ),
  ],
}

export default defineConfig(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/.wrangler/',
      '**/test-results/',
      '**/playwright-report/',
      'apps/server/worker-configuration.d.ts',
      'packages/sim/out/',
      'docs/',
    ],
  },
  js.configs.recommended,
  ts.configs.strict,
  svelte.configs.recommended,
  prettier,
  svelte.configs.prettier,
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: { parser: ts.parser },
    },
  },
  {
    files: ['apps/web/src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // ---- Regras de arquitetura ----
  {
    files: ['packages/engine/src/**/*.ts'],
    rules: { ...onlyImports([], 'o motor não depende de nenhum outro pacote'), ...purity },
  },
  {
    files: ['packages/content/src/**/*.ts'],
    rules: { ...onlyImports(['engine'], 'o conteúdo só depende do motor'), ...purity },
  },
  {
    files: ['packages/kit/src/**/*.ts'],
    rules: {
      ...onlyImports([], 'o kit é agnóstico de jogo e só conhece GameDefinition'),
      ...purity,
    },
  },
  {
    files: ['packages/bots/src/**/*.ts'],
    rules: {
      ...onlyImports(['engine'], 'os bots só dependem do motor (e só veem PublicView)'),
      ...purity,
    },
  },
  {
    files: ['packages/protocol/src/**/*.ts'],
    rules: onlyImports(['engine', 'kit'], 'o protocolo só depende do motor e do kit'),
  },
  {
    files: ['packages/sim/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@magnifier-cases/web', '@magnifier-cases/server', '@magnifier-cases/kit'],
              message: layer('a simulação não usa a interface, o servidor nem as salas'),
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,svelte}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@magnifier-cases/sim', '@magnifier-cases/server'],
              message: layer('a interface não importa a simulação nem o servidor'),
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/server/src/**/*.ts'],
    rules: {
      // Um log pode vazar a solução, a semente ou uma carta fechada (CLAUDE.md, "Segredo").
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@magnifier-cases/sim', '@magnifier-cases/web'],
              message: layer('o servidor não importa a simulação nem a interface'),
            },
          ],
        },
      ],
    },
  },
)
