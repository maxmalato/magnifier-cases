// Salas de ponta a ponta no runtime dos Workers: criar, entrar por WebSocket, lobby, partida,
// recusa de quem não tem a vez, opinar, desconexão com bot assumindo e volta pelo token, e o
// teste de vazamento sobre todas as mensagens enviadas (spec, seção 11).
// Ajudantes adaptados do village-flood.
import { exports } from 'cloudflare:workers'
import { env, runInDurableObject } from 'cloudflare:test'
import { legalActions, type GameState } from '@magnifier-cases/engine'
import type { Notice, RoomRecord } from '@magnifier-cases/kit'
import type {
  MagnifierRoomView,
  MagnifierServerMessage,
  RoomConfig,
} from '@magnifier-cases/protocol'
import { describe, expect, it } from 'vitest'
import type { Room } from '../src/room.ts'

type Message = MagnifierServerMessage

async function createRoom(level = 'apprentice'): Promise<string> {
  const response = await exports.default.fetch('https://example.com/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ config: { level } }),
  })
  expect(response.status).toBe(201)
  return ((await response.json()) as { code: string }).code
}

const describeMessage = (m: Message) => {
  if (m.type === 'error') return `error:${m.code}`
  if (m.type === 'notice') return `notice:${m.notice.type}`
  if (m.type === 'room' || m.type === 'update')
    return `${m.type}[${m.room.status}/${m.room.game?.activeSeat ?? '-'}]`
  return m.type
}

/** Cliente de teste: guarda todas as mensagens recebidas e espera por uma condição. */
async function connect(code: string, label: string) {
  const response = await exports.default.fetch(`https://example.com/api/rooms/${code}/ws`, {
    headers: { Upgrade: 'websocket' },
  })
  const ws = response.webSocket
  if (!ws) throw new Error(`sem WebSocket (${response.status})`)
  ws.accept()
  const inbox: Message[] = []
  /** Todas as mensagens em texto, como chegaram (para o teste de vazamento). */
  const raw: string[] = []
  const waiters: (() => void)[] = []
  ws.addEventListener('message', (event) => {
    raw.push(event.data as string)
    inbox.push(JSON.parse(event.data as string) as Message)
    for (const wake of waiters.splice(0)) wake()
  })
  const sleep = () =>
    new Promise<void>((resolve) => {
      waiters.push(resolve)
      setTimeout(resolve, 50)
    })
  return {
    ws,
    raw,
    send: (message: unknown) => ws.send(JSON.stringify(message)),
    /** Espera (e consome) a primeira mensagem que satisfaz a condição. */
    async waitFor<T extends Message>(test: (m: Message) => m is T, timeout = 5000): Promise<T> {
      const deadline = Date.now() + timeout
      for (;;) {
        const found = inbox.find(test)
        if (found) {
          inbox.splice(inbox.indexOf(found), 1)
          return found
        }
        if (Date.now() > deadline)
          throw new Error(
            `${label}: mensagem não chegou; recebidas: ${inbox.map(describeMessage).join(', ')}`,
          )
        await sleep()
      }
    },
    /** Espera até a visão MAIS RECENTE da sala satisfazer a condição. */
    async room(test: (room: MagnifierRoomView) => boolean = () => true, timeout = 5000) {
      const deadline = Date.now() + timeout
      for (;;) {
        const latest = inbox.flatMap((m) => ('room' in m ? [m.room] : [])).at(-1)
        if (latest && test(latest)) return latest
        if (Date.now() > deadline) throw new Error(`${label}: a sala não chegou ao estado esperado`)
        await sleep()
      }
    },
  }
}

const isError = (m: Message): m is Extract<Message, { type: 'error' }> => m.type === 'error'
const isWelcome = (m: Message): m is Extract<Message, { type: 'welcome' }> => m.type === 'welcome'
const isNotice =
  (type: Notice['type']) =>
  (m: Message): m is Extract<Message, { type: 'notice' }> =>
    m.type === 'notice' && m.notice.type === type

async function join(code: string, name: string) {
  const client = await connect(code, name)
  client.send({ type: 'hello', name })
  const welcome = await client.waitFor(isWelcome)
  return { ...client, seat: welcome.seat, token: welcome.token }
}

/** Ana (anfitriã) e Bruno na sala, partida começada. */
async function startedRoom(level = 'apprentice') {
  const code = await createRoom(level)
  const ana = await join(code, 'Ana')
  const bruno = await join(code, 'Bruno')
  ana.send({ type: 'start' })
  await ana.room((r) => r.status === 'playing')
  await bruno.room((r) => r.status === 'playing')
  return { code, ana, bruno }
}

function stubOf(code: string) {
  return env.ROOMS.get(env.ROOMS.idFromName(code))
}

async function secretOf(code: string) {
  return runInDurableObject(stubOf(code), async (instance: Room) => {
    const record = (instance as unknown as { record: RoomRecord<GameState, RoomConfig> }).record
    const game = record.game as GameState
    return { solution: game.solution, seed: game.seed, oracle: game.oracle }
  })
}

describe('salas', () => {
  it('cria a sala, mostra o resumo e recusa configuração inválida', async () => {
    const code = await createRoom('expert')
    const info = await exports.default.fetch(`https://example.com/api/rooms/${code}`)
    expect(await info.json()).toEqual({
      status: 'lobby',
      seats: 0,
      maxSeats: 6,
      config: { level: 'expert' },
    })
    const bad = await exports.default.fetch('https://example.com/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ config: { level: 'boss' } }),
    })
    expect(bad.status).toBe(400)
    const missing = await exports.default.fetch('https://example.com/api/rooms/ZZZZZZ')
    expect(missing.status).toBe(404)
  })

  it('quem não tem a vez é recusado; quem tem a vez joga', async () => {
    const { ana, bruno } = await startedRoom()
    const view = await bruno.room((r) => r.game !== null)
    const game = view.game
    if (!game) throw new Error('sem jogo')
    expect(game.activeSeat).toBe(ana.seat)
    const action = legalActions(game).find((a) => a.type === 'interrogate')
    bruno.send({ type: 'action', action })
    const refused = await bruno.waitFor(isError)
    expect(refused.code).toBe('notYourTurn')
    ana.send({ type: 'action', action })
    await bruno.room((r) => r.game?.activeSeat === bruno.seat)
  })

  it('opinar: só fora da vez, uma por jogador, some quando a vez muda', async () => {
    const { ana, bruno } = await startedRoom()
    const view = await ana.room((r) => r.game !== null)
    const suspect = view.game?.cast.suspects[0]
    ana.send({ type: 'suggest', target: { kind: 'suspect', id: suspect } })
    expect((await ana.waitFor(isError)).code).toBe('yourTurn')
    bruno.send({ type: 'suggest', target: { kind: 'suspect', id: suspect } })
    await ana.room((r) => r.suggestions.length === 1)
    bruno.send({ type: 'suggest', target: { kind: 'option', option: 'move' } })
    const room = await ana.room((r) => r.suggestions[0]?.target === 'option:move')
    expect(room.suggestions).toEqual([{ seat: bruno.seat, target: 'option:move' }])
    bruno.send({ type: 'suggest', target: { kind: 'suspect', id: 'nobody' } })
    expect((await bruno.waitFor(isError)).code).toBe('invalidSuggestion')
    ana.send({ type: 'action', action: { type: 'interrogate', suspectId: suspect } })
    await ana.room((r) => r.suggestions.length === 0 && r.game?.activeSeat === bruno.seat)
  })

  it('encerrar: só quem comanda a sala, para todos, e a resposta é revelada', async () => {
    const { code, ana, bruno } = await startedRoom()
    bruno.send({ type: 'end' })
    expect((await bruno.waitFor(isError)).code).toBe('onlyHost')
    const { solution } = await secretOf(code)
    // Ana comanda a sala e encerra (a vez nem precisa ser dela)
    ana.send({ type: 'end' })
    const room = await bruno.room((r) => r.status === 'over')
    expect(room.game?.phase).toBe('ended')
    expect(room.game?.reveal?.solution).toEqual(solution)
    // depois de encerrar, quem comanda pode jogar de novo
    ana.send({ type: 'again' })
    await bruno.room((r) => r.status === 'lobby')
  })

  it('desconexão: o bot assume a vez de quem caiu e a pessoa volta pelo token', async () => {
    const { code, ana, bruno } = await startedRoom()
    await bruno.room((r) => r.game?.activeSeat === ana.seat)
    ana.ws.close(1000, 'saiu')
    await bruno.waitFor(isNotice('player-away'))
    // o bot assume depois de TAKEOVER_MS (200 ms nos testes) e joga a vez da Ana
    await bruno.waitFor(isNotice('bot-took-over'))
    await bruno.room((r) => r.game?.activeSeat === bruno.seat)
    // Ana volta pelo token e recebe a sala inteira
    const back = await connect(code, 'Ana de volta')
    back.send({ type: 'hello', token: ana.token })
    expect((await back.waitFor(isWelcome)).seat).toBe(ana.seat)
    await back.room((r) => r.game !== null)
    await bruno.waitFor(isNotice('player-back-soon'))
    // Bruno joga; na vez da Ana, ela retoma o controle
    const view = await bruno.room((r) => r.game?.activeSeat === bruno.seat)
    const action = legalActions(view.game as NonNullable<typeof view.game>).find(
      (a) => a.type === 'interrogate',
    )
    bruno.send({ type: 'action', action })
    await bruno.waitFor(isNotice('player-returned'))
    const seats = (await bruno.room((r) => r.game?.activeSeat === ana.seat)).seats
    expect(seats.find((s) => s.seat === ana.seat)?.presence).toBe('connected')
  })

  it('token desconhecido é recusado', async () => {
    const code = await createRoom()
    const stranger = await connect(code, 'estranho')
    stranger.send({ type: 'hello', token: 'token-que-nao-existe' })
    expect((await stranger.waitFor(isError)).code).toBe('unknownToken')
  })
})

describe('vazamento', () => {
  it('nenhuma mensagem contém a solução, a semente, o oráculo ou carta fechada antes do fim', async () => {
    const { code, ana, bruno } = await startedRoom('investigator')
    const secret = await secretOf(code)
    const clients = [ana, bruno]
    // joga ações que não encerram a partida, alternando a vez, enquanto houver tempo
    for (let step = 0; step < 6; step++) {
      const view = await ana.room((r) => r.game !== null)
      const game = view.game
      if (!game || game.phase !== 'playing' || game.actionsLeft <= 1) break
      const action = legalActions(game).find((a) => a.type !== 'accuse')
      const active = clients.find((c) => c.seat === game.activeSeat)
      if (!active || !action) break
      active.send({ type: 'action', action })
      await ana.room((r) => r.game?.turn === game.turn + 1)
    }
    const all = [...ana.raw, ...bruno.raw]
    expect(all.length).toBeGreaterThan(5)
    for (const text of all) {
      expect(text).not.toMatch(/"solution"|"seed"|"oracle"|"culpritId"|"hideoutId"|"keyCardIds"/)
      expect(text).not.toContain(String(secret.seed))
      expect(text).not.toMatch(/tokenHash/)
    }
    // as cartas fechadas aparecem só pela origem (sem texto nem efeito)
    const last = await ana.room()
    for (const closed of last.game?.unopened ?? []) expect(Object.keys(closed)).toEqual(['source'])
  })
})
