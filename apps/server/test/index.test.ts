import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

describe('worker', () => {
  it('responde ao /api/health com a versão do protocolo', async () => {
    const response = await exports.default.fetch('https://example.com/api/health')
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(await response.json()).toEqual({ ok: true, protocol: 'magnifier-cases/v1' })
  })

  it('responde 404 para rota desconhecida da API', async () => {
    const response = await exports.default.fetch('https://example.com/api/nada')
    expect(response.status).toBe(404)
  })
})
