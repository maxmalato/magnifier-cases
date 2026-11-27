<script lang="ts">
  // Início → (um aparelho) montar a equipe → novo mistério → partida;
  //        → (online) criar ou entrar na sala → lobby online → partida.
  import { partyCake } from '@magnifier-cases/content'
  import { canShowTable, difficultyOf, type LevelId } from '@magnifier-cases/engine'
  import { LocalGame, type Seat } from './lib/game/local-game.svelte.ts'
  import { cleanName, type SeatDraft } from './lib/game/setup.ts'
  import { codeFromUrl, forgetRoom, savedRoom } from './lib/online/link.ts'
  import { OnlineGame } from './lib/online/online-game.svelte.ts'
  import { setLocale, t, ui } from './lib/locale.svelte.ts'
  import Briefing from './lib/screens/Briefing.svelte'
  import GameScreen from './lib/screens/GameScreen.svelte'
  import Home from './lib/screens/Home.svelte'
  import Lobby from './lib/screens/Lobby.svelte'
  import OnlineEntry from './lib/screens/OnlineEntry.svelte'
  import OnlineLobby from './lib/screens/OnlineLobby.svelte'
  import TableScreen from './lib/screens/TableScreen.svelte'
  import { createTableRoom } from './lib/online/api.ts'
  import Header from './lib/ui/Header.svelte'
  import Coach from './lib/tutorial/Coach.svelte'
  import { howToPlay } from './lib/tutorial/launcher.svelte.ts'
  import { TutorialGame } from './lib/tutorial/tutorial-game.svelte.ts'
  import { untrack } from 'svelte'
  import type { MessageKey } from './i18n.ts'

  /** Espera padrão antes de cada jogada de bot, para a equipe acompanhar. */
  const BOT_DELAY_MS = 900

  type Screen = 'home' | 'lobby' | 'briefing' | 'game' | 'create' | 'join' | 'online'
  const invited = codeFromUrl()
  /**
   * A mesa só existe em tela grande: menor lado da tela FÍSICA ≥ 600 px (window.screen, não a
   * janela). É uma barreira de interface, não de segurança.
   */
  const tableAllowed = canShowTable(window.screen)
  const wantsTable = new URLSearchParams(location.search).has('mesa')
  let tableBlocked = $state(wantsTable && !tableAllowed)
  let screen = $state<Screen>(invited ? 'join' : 'home')
  let level = $state<LevelId>('apprentice')
  let seats = $state<SeatDraft[]>([
    { kind: 'human', name: '' },
    { kind: 'bot', name: '' },
  ])
  let game = $state<LocalGame | null>(null)
  let online = $state<OnlineGame | null>(null)
  let saved = $state(savedRoom())

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
    online?.close()
    online = null
    saved = savedRoom()
    screen = 'home'
  }

  function enterRoom(code: string, who: { name: string } | { token: string }) {
    online?.close()
    online = new OnlineGame(code, who)
    screen = 'online'
  }

  async function openTable() {
    try {
      const { code, token } = await createTableRoom({ level: 'apprentice' })
      enterRoom(code, { token })
    } catch {
      // sem servidor: fica na tela inicial
    }
  }

  // ?mesa numa tela grande abre a mesa direto
  if (wantsTable && tableAllowed) void openTable()

  function leaveRoom() {
    online?.leave()
    online = null
    saved = null
    goHome()
  }

  const fatalText = $derived(
    online?.connection.fatal ? t(`error.${online.connection.fatal}` as MessageKey) : null,
  )
  const hostName = $derived(
    online?.room?.seats.find((s) => s.seat === online?.room?.host)?.name ?? '',
  )

  // cada tela nova começa do topo
  $effect(() => {
    void screen
    void howToPlay.open
    window.scrollTo({ top: 0 })
  })

  /**
   * Partida de treino ("Como jogar"): desenhada por cima da tela atual. A partida em andamento
   * (deste aparelho ou online) continua guardada; ao sair do treino, a pessoa volta para ela.
   */
  let tutorial = $state<TutorialGame | null>(null)
  $effect(() => {
    const open = howToPlay.open
    untrack(() => {
      if (open && !tutorial) tutorial = new TutorialGame(t('tutorial.player'))
      if (!open && tutorial) {
        tutorial.destroy()
        tutorial = null
      }
    })
  })
  function closeTutorial() {
    howToPlay.open = false
  }
</script>

{#if tutorial}
  <div class="practice">
    <GameScreen game={tutorial} onhome={closeTutorial} homeLabel={t('tutorial.exit')} />
  </div>
  <Coach game={tutorial} onexit={closeTutorial} />
{:else if screen === 'home'}
  <Home
    onplay={() => (screen = 'lobby')}
    oncreate={() => (screen = 'create')}
    onjoin={() => (screen = 'join')}
    savedCode={saved && (!saved.table || tableAllowed) ? saved.code : null}
    savedIsTable={saved?.table === true}
    onrejoin={() => saved && enterRoom(saved.code, { token: saved.token })}
    ontable={tableAllowed ? openTable : undefined}
    {tableBlocked}
  />
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
{:else if screen === 'create' || screen === 'join'}
  <OnlineEntry
    mode={screen}
    initialCode={invited ?? ''}
    onready={(code, name) => enterRoom(code, { name })}
    onback={() => (screen = 'home')}
  />
{:else if screen === 'online' && online}
  {#if fatalText}
    <main class="screen">
      <Header />
      <p class="fatal" role="alert">{fatalText}</p>
      <button
        type="button"
        class="btn btn-primary"
        onclick={() => {
          forgetRoom()
          goHome()
        }}
      >
        {t('reveal.home')}
      </button>
    </main>
  {:else if online.isTable}
    <TableScreen game={online} onclose={leaveRoom} />
  {:else if !online.room || (online.room.status !== 'lobby' && !online.room.game)}
    <main class="screen">
      <Header />
      <p role="status">{t('online.connecting')}</p>
    </main>
  {:else if online.room.status === 'lobby'}
    <OnlineLobby game={online} onleave={leaveRoom} />
  {:else}
    <GameScreen
      game={online}
      onagain={online.isHost ? () => online?.playAgain() : undefined}
      onhome={leaveRoom}
      waitText={t('reveal.waitHost', { name: hostName })}
    />
  {/if}
{/if}

<style>
  /* espaço para o painel do treinador, que fica fixo embaixo */
  .practice {
    padding-bottom: 240px;
  }
  .fatal {
    margin: 0;
    padding: 12px;
    border-radius: 12px;
    border: 2px solid var(--accent-text);
    font-weight: 800;
  }
</style>
