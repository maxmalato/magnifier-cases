<script lang="ts">
  // Modo de um aparelho (Etapa 3): início → montar a equipe → novo mistério → partida.
  import { partyCake } from '@magnifier-cases/content'
  import { difficultyOf, type LevelId } from '@magnifier-cases/engine'
  import { LocalGame, type Seat } from './lib/game/local-game.svelte.ts'
  import { cleanName, type SeatDraft } from './lib/game/setup.ts'
  import { setLocale, t, ui } from './lib/locale.svelte.ts'
  import Briefing from './lib/screens/Briefing.svelte'
  import GameScreen from './lib/screens/GameScreen.svelte'
  import Home from './lib/screens/Home.svelte'
  import Lobby from './lib/screens/Lobby.svelte'

  /** Espera padrão antes de cada jogada de bot, para a equipe acompanhar. */
  const BOT_DELAY_MS = 900

  let screen = $state<'home' | 'lobby' | 'briefing' | 'game'>('home')
  let level = $state<LevelId>('apprentice')
  let seats = $state<SeatDraft[]>([
    { kind: 'human', name: '' },
    { kind: 'bot', name: '' },
  ])
  let game = $state<LocalGame | null>(null)

  setLocale(ui.locale)

  /**
   * Semente do mistério e dos bots. Sorteada no aparelho; nos testes de ponta a ponta pode vir
   * da URL (?seed=, ?botDelay=). No modo de um aparelho o segredo já vive aqui mesmo (jogo
   * cooperativo); no online a semente vem do servidor.
   */
  function randomSeed(): number {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0
  }
  function fromUrl(name: string): number | null {
    const raw = new URLSearchParams(location.search).get(name)
    const n = raw === null ? Number.NaN : Number(raw)
    return Number.isInteger(n) && n >= 0 ? n : null
  }

  function buildSeats(): Seat[] {
    let bots = 0
    return seats.map((s, i) => ({
      id: `seat-${i + 1}`,
      kind: s.kind,
      name: s.kind === 'bot' ? t('lobby.botName', { n: ++bots }) : cleanName(s.name),
    }))
  }

  function newMystery() {
    game?.destroy()
    game = new LocalGame({
      params: difficultyOf(level),
      theme: partyCake,
      seats: buildSeats(),
      seed: fromUrl('seed') ?? randomSeed(),
      botSeed: randomSeed(),
      botDelayMs: fromUrl('botDelay') ?? BOT_DELAY_MS,
    })
    screen = 'briefing'
  }

  function goHome() {
    game?.destroy()
    game = null
    screen = 'home'
  }

  // cada tela nova começa do topo
  $effect(() => {
    void screen
    window.scrollTo({ top: 0 })
  })
</script>

{#if screen === 'home'}
  <Home onplay={() => (screen = 'lobby')} />
{:else if screen === 'lobby'}
  <Lobby bind:level bind:seats onstart={newMystery} onback={() => (screen = 'home')} />
{:else if screen === 'briefing' && game}
  <Briefing
    {game}
    onstart={() => {
      game?.start()
      screen = 'game'
    }}
  />
{:else if screen === 'game' && game}
  <GameScreen {game} onagain={newMystery} onhome={goHome} />
{/if}
