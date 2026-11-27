// O nome público depende de consulta ao INPI: ele vive só na constante `appName`
// (packages/content/src/i18n.ts). Este teste procura o nome escrito em qualquer outro arquivo
// de código, configuração ou página do monorepo. Documentos (docs/, READMEs, CLAUDE.md) ficam
// de fora: eles falam do jogo, não fazem parte do código.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { appName } from '../src/index.ts'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const source = join(root, 'packages/content/src/i18n.ts')
const scanned = /\.(ts|js|mjs|cjs|svelte|html|css|json|jsonc|yml|yaml|webmanifest)$/
const skippedDirs = new Set([
  'node_modules',
  'dist',
  '.wrangler',
  '.git',
  'docs',
  'assets',
  'test-results',
  'playwright-report',
  'coverage',
  'out',
])

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!skippedDirs.has(entry.name)) yield* files(join(dir, entry.name))
    } else if (scanned.test(entry.name) && entry.name !== 'pnpm-lock.yaml') {
      yield join(dir, entry.name)
    }
  }
}

describe('appName', () => {
  it('o nome público só aparece na constante appName', () => {
    const needle = appName.toLocaleLowerCase('pt-BR')
    const offenders = [...files(root)]
      .filter((file) => file !== source && file !== fileURLToPath(import.meta.url))
      .filter((file) => readFileSync(file, 'utf8').toLocaleLowerCase('pt-BR').includes(needle))
      .map((file) => relative(root, file))
    expect(offenders).toEqual([])
  })

  it('o nome no endereço do site (casos-da-lupa) só aparece na configuração do Worker', () => {
    // O nome do Worker vira o endereço público (decisão do dono, 27/11/2026). Se o nome mudar
    // depois da consulta ao INPI, só este arquivo (e o appName) muda.
    const slug = appName
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLocaleLowerCase('pt-BR')
      .replace(/\s+/g, '-')
    const allowed = join(root, 'apps/server/wrangler.jsonc')
    const found = [...files(root)]
      .filter((file) => file !== fileURLToPath(import.meta.url))
      .filter((file) => readFileSync(file, 'utf8').toLocaleLowerCase('pt-BR').includes(slug))
    expect(found.map((file) => relative(root, file))).toEqual([relative(root, allowed)])
  })
})
