// Worker de entrada. O próprio Worker serve o site (apps/web/dist); só /api/* chega aqui.
// Etapa 0: só a verificação de saúde. Criar sala, entrar e a conexão com o Durable Object da
// sala entram na Etapa 4. Nenhuma resposta leva dado da partida: o servidor só envia PublicView.
import { PROTOCOL_ID } from '@magnifier-cases/protocol'

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export default {
  async fetch(request): Promise<Response> {
    const path = new URL(request.url).pathname
    if (path === '/api/health') return json({ ok: true, protocol: PROTOCOL_ID })
    return json({ error: 'notFound' }, 404)
  },
} satisfies ExportedHandler<Env>
