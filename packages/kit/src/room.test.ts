// Núcleo da sala com o jogo fictício (um número secreto). Adaptado do village-flood.
import { describe, expect, it } from 'vitest'
import { ROOM_TTL_MS, TABLE_SEAT, type RoomTimings } from './constants.ts'
import { parseClientMessage, RateLimiter } from './messages.ts'
import {
  act,
  addBot,
  createRoom,
  disconnect,
  isExpired,
  joinRoom,
  leave,
  nextWake,
  playAgain,
  reconnect,
  removeSeat,
  setConfig,
  startGame,
  suggest,
  tick,
  unsuggest,
  viewOf,
  type Outcome,
  type RoomRecord,
} from './room.ts'
import { guessGame as def, type GuessConfig, type GuessEvent, type GuessState } from './testing.ts'

type Room = RoomRecord<GuessState, GuessConfig>
type Out = Outcome<GuessState, GuessEvent, GuessConfig>

const timings: RoomTimings = { takeoverMs: 20_000, botStepMs: 1_000 }
// semente 4: o número secreto é 5 (seed % 10 + 1); os palpites 1 a 4 erram
const SEED = 4

function okRecord(out: Out): Room {
  if (out.error) throw new Error(out.error)
  return out.record
}

/** Sala com Ana (anfitriã) e Bruno, pessoas conectadas. */
function lobby(): Room {
  let room: Room = createRoom('ABCDEF', def.defaultConfig, 0)
  room = okRecord(joinRoom(def, room, 'Ana', 'hash-ana', 1))
  room = okRecord(joinRoom(def, room, 'Bruno', 'hash-bruno', 2))
  return room
}

function started(room = lobby()): Room {
  return okRecord(startGame(def, room, 'seat-1', SEED, 10, timings))
}

describe('mensagens', () => {
  it('valida as mensagens recebidas', () => {
    expect(parseClientMessage('{"type":"hello","name":"Ana"}')).toEqual({
      type: 'hello',
      name: 'Ana',
    })
    expect(parseClientMessage('{"type":"suggest","target":3}')).toEqual({
      type: 'suggest',
      target: 3,
    })
    expect(parseClientMessage('{"type":"unsuggest"}')).toEqual({ type: 'unsuggest' })
    expect(parseClientMessage('não é json')).toBeNull()
    expect(parseClientMessage('{"type":"profile","profile":"x"}')).toBeNull()
    expect(parseClientMessage('x'.repeat(10_000))).toBeNull()
  })

  it('limita mensagens por janela de tempo', () => {
    const limiter = new RateLimiter(2, 1000)
    expect([limiter.allow('a', 0), limiter.allow('a', 1), limiter.allow('a', 2)]).toEqual([
      true,
      true,
      false,
    ])
    expect(limiter.allow('a', 1000)).toBe(true)
  })
})

describe('lobby', () => {
  it('primeira pessoa é a anfitriã', () => {
    const room = lobby()
    expect(room.host).toBe('seat-1')
    expect(room.seats.map((s) => [s.seat, s.name, s.kind])).toEqual([
      ['seat-1', 'Ana', 'human'],
      ['seat-2', 'Bruno', 'human'],
    ])
  })

  it('apelido digitado de até 20 caracteres, sem repetir', () => {
    const room = lobby()
    expect(joinRoom(def, room, ' ana ', 'h', 3).error).toBe('nameTaken')
    expect(joinRoom(def, room, '   ', 'h', 3).error).toBe('invalidName')
    expect(joinRoom(def, room, 'x'.repeat(21), 'h', 3).error).toBe('invalidName')
    const full = okRecord(joinRoom(def, room, 'Carla', 'h3', 3))
    expect(joinRoom(def, full, 'Diego', 'h4', 4).error).toBe('roomFull')
  })

  it('só quem comanda adiciona bot e muda a configuração', () => {
    const room = lobby()
    expect(addBot(def, room, 'seat-2', 5).error).toBe('onlyHost')
    const withBot = okRecord(addBot(def, room, 'seat-1', 5))
    expect(withBot.seats.at(-1)).toMatchObject({ name: 'Bot 1', kind: 'bot', presence: 'bot' })
    expect(setConfig(def, room, 'seat-1', { max: 20 }, 6).record.config).toEqual({ max: 20 })
    expect(setConfig(def, room, 'seat-1', 'nada', 6).error).toBe('invalidConfig')
    expect(removeSeat(withBot, 'seat-1', 'seat-3', 7).record.seats).toHaveLength(2)
    expect(removeSeat(withBot, 'seat-1', 'seat-2', 7).error).toBe('stillConnected')
  })

  it('sair no lobby libera o assento e passa o comando', () => {
    const room = okRecord(leave(def, lobby(), 'seat-1', 8, timings))
    expect(room.seats.map((s) => s.seat)).toEqual(['seat-2'])
    expect(room.host).toBe('seat-2')
  })
})

describe('visão por destinatário', () => {
  it('o estado do jogo só sai pela visão: sem o número secreto', () => {
    const room = started()
    for (const viewer of ['seat-1', 'seat-2', TABLE_SEAT]) {
      const view = viewOf(def, room, viewer)
      expect(JSON.stringify(view)).not.toMatch(/secret|tokenHash|hash-/)
      expect(view.game).toEqual({ activeSeat: 'seat-1', guesses: [], won: false })
    }
  })
})

describe('partida', () => {
  it('só quem tem a vez age; ação inválida é recusada sem mudar nada', () => {
    const room = started()
    expect(act(def, room, 'seat-2', { type: 'guess', n: 1 }, 11, timings).error).toBe('notYourTurn')
    expect(act(def, room, 'seat-1', { type: 'fly' }, 11, timings).error).toBe('badAction')
    const after = okRecord(act(def, room, 'seat-1', { type: 'guess', n: 1 }, 11, timings))
    expect(after.game?.guesses).toEqual([1])
    expect(act(def, after, 'seat-2', { type: 'guess', n: 1 }, 12, timings).error).toBe(
      'refused:repeated',
    )
  })

  it('acertar encerra a partida; jogar de novo volta ao lobby', () => {
    let room = started()
    room = okRecord(act(def, room, 'seat-1', { type: 'guess', n: 5 }, 11, timings))
    expect(room.status).toBe('over')
    expect(viewOf(def, room, 'seat-2').game?.secret).toBe(5)
    expect(playAgain(room, 'seat-2', 12).error).toBe('onlyHost')
    const again = okRecord(playAgain(room, 'seat-1', 12))
    expect(again.status).toBe('lobby')
    expect(again.game).toBeNull()
  })
})

describe('sugestões (opinar)', () => {
  it('uma sugestão por jogador, fora da vez, trocada e apagada no turno seguinte', () => {
    let room = started()
    expect(suggest(def, room, 'seat-1', 3, 11).error).toBe('yourTurn')
    expect(suggest(def, room, 'seat-2', 'x', 11).error).toBe('invalidSuggestion')
    room = okRecord(suggest(def, room, 'seat-2', 3, 11))
    room = okRecord(suggest(def, room, 'seat-2', 4, 12))
    expect(room.suggestions).toEqual([{ seat: 'seat-2', target: 'guess:4' }])
    room = okRecord(unsuggest(room, 'seat-2', 13))
    expect(room.suggestions).toEqual([])
    room = okRecord(suggest(def, room, 'seat-2', 2, 14))
    room = okRecord(act(def, room, 'seat-1', { type: 'guess', n: 1 }, 15, timings))
    expect(room.suggestions).toEqual([])
  })

  it('limite de trocas por turno vem do jogo', () => {
    let room = started()
    for (let n = 1; n <= def.maxSuggestionChangesPerTurn; n++)
      room = okRecord(suggest(def, room, 'seat-2', n, 11 + n))
    expect(suggest(def, room, 'seat-2', 9, 20).error).toBe('tooManySuggestions')
  })
})

describe('desconexão e bots', () => {
  it('quem cai na própria vez: aviso, bot assume depois do prazo e joga só com a visão', () => {
    let room = started()
    const out = disconnect(def, room, 'seat-1', 100, timings)
    expect(out.notices).toEqual([{ type: 'player-away', seat: 'seat-1' }])
    room = okRecord(out)
    expect(room.seats[0]).toMatchObject({ presence: 'away', takeoverAt: 100 + timings.takeoverMs })
    expect(nextWake(room)).toBe(100 + timings.takeoverMs)
    // antes do prazo, nada; depois, o bot assume e a jogada fica agendada
    expect(tick(def, room, 101, timings).notices).toEqual([])
    const taken = tick(def, room, 100 + timings.takeoverMs, timings)
    expect(taken.notices).toContainEqual({ type: 'bot-took-over', seat: 'seat-1' })
    room = okRecord(taken)
    expect(room.seats[0]?.presence).toBe('bot')
    const played = tick(def, room, room.nextBotAt ?? 0, timings)
    expect(played.events.length).toBeGreaterThan(0)
    expect(played.by).toBe('seat-1')
  })

  it('quem cai fora da vez: o bot assume quando chega a vez dela', () => {
    let room = started()
    room = okRecord(disconnect(def, room, 'seat-2', 100, timings))
    expect(room.seats[1]?.takeoverAt).toBeNull()
    const out = act(def, room, 'seat-1', { type: 'guess', n: 1 }, 110, timings)
    expect(out.notices).toContainEqual({ type: 'bot-took-over', seat: 'seat-2' })
    expect(out.record.seats[1]?.presence).toBe('bot')
  })

  it('volta pelo token: antes do bot, na hora; com o bot, no início do próprio turno', () => {
    let room = started()
    room = okRecord(disconnect(def, room, 'seat-2', 100, timings))
    const back = reconnect<GuessState, GuessEvent, GuessConfig>(room, 'hash-bruno', 101)
    expect(back.seat).toBe('seat-2')
    expect(back.record.seats[1]?.presence).toBe('connected')
    expect(back.notices).toEqual([{ type: 'player-returned', seat: 'seat-2' }])
    // agora com o bot no lugar
    room = okRecord(disconnect(def, back.record, 'seat-2', 102, timings))
    room = okRecord(act(def, room, 'seat-1', { type: 'guess', n: 1 }, 103, timings))
    expect(room.seats[1]?.presence).toBe('bot')
    const soon = reconnect<GuessState, GuessEvent, GuessConfig>(room, 'hash-bruno', 104)
    expect(soon.notices).toEqual([{ type: 'player-back-soon', seat: 'seat-2' }])
    // o bot termina a vez; a pessoa retoma no turno seguinte dela
    room = okRecord(tick(def, soon.record, soon.record.nextBotAt ?? 0, timings))
    room = okRecord(act(def, room, 'seat-1', { type: 'guess', n: 3 }, 2_000, timings))
    expect(room.seats[1]?.presence).toBe('connected')
    expect(reconnect(room, 'hash-errado', 2_001).error).toBe('unknownToken')
  })

  it('sala expira depois de 12 h sem atividade', () => {
    const room = lobby()
    expect(isExpired(room, room.lastActivity + ROOM_TTL_MS - 1)).toBe(false)
    expect(isExpired(room, room.lastActivity + ROOM_TTL_MS)).toBe(true)
  })
})

describe('mesa', () => {
  it('a mesa entra pelo próprio token e não ocupa assento', () => {
    const room = createRoom<GuessState, GuessConfig>('ABCDEF', def.defaultConfig, 0, 'hash-mesa')
    const out = reconnect<GuessState, GuessEvent, GuessConfig>(room, 'hash-mesa', 1)
    expect(out.seat).toBe(TABLE_SEAT)
    expect(out.record.table?.connected).toBe(true)
    expect(out.record.seats).toHaveLength(0)
  })
})
