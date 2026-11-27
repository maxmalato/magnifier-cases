<script lang="ts">
  // Conduz a partida: vez de alguém, escolhas, confirmação, telas de resultado e revelação. Vale
  // para a partida deste aparelho e para a online; no online, fora da própria vez, as escolhas
  // viram sugestões (opinar).
  import { formatItem } from '@magnifier-cases/content'
  import type { Action } from '@magnifier-cases/engine'
  import type { GameController } from '../game/controller.ts'
  import ConfirmDialog from '../ui/ConfirmDialog.svelte'
  import NoticeBar from '../ui/NoticeBar.svelte'
  import Accuse from './Accuse.svelte'
  import ChoosePlace from './ChoosePlace.svelte'
  import ChooseSuspect from './ChooseSuspect.svelte'
  import ClueResult from './ClueResult.svelte'
  import Notebook from './Notebook.svelte'
  import Reveal from './Reveal.svelte'
  import Turn from './Turn.svelte'
  import WrongResult from './WrongResult.svelte'
  import { duration, t, ui } from '../locale.svelte.ts'

  let {
    game,
    onagain,
    onhome,
    waitText,
  }: {
    game: GameController
    onagain?: (() => void) | undefined
    onhome: () => void
    waitText?: string | undefined
  } = $props()

  let page = $state<'turn' | 'suspect' | 'place' | 'notebook' | 'accuse'>('turn')
  let asking = $state<Action | null>(null)
  /** Pedindo confirmação para encerrar a partida. */
  let ending = $state(false)
  /** Online, fora da própria vez: as escolhas viram sugestões. */
  const suggesting = $derived(
    !game.canAct &&
      (game.online?.canSuggest ?? false) &&
      (game.online?.suggestionsLeft ?? 0) > 0 &&
      !game.isBotTurn,
  )

  // sem poder jogar nem sugerir (vez de bot, fim), volta para a tela principal
  $effect(() => {
    if (game.isOver || (!game.canAct && !suggesting)) {
      if (page !== 'notebook') page = 'turn'
      asking = null
    }
    if (game.isOver) ending = false
  })

  // a cada tela nova, o topo da página
  $effect(() => {
    void page
    void game.overlay
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  })

  function confirmText(action: Action): string {
    const loc = ui.locale
    switch (action.type) {
      case 'interrogate':
        return t('confirm.interrogate', { name: formatItem(action.suspectId, loc) })
      case 'investigate':
        return t('confirm.investigate', { place: formatItem(game.view.teamAt, loc) })
      case 'move':
        return t('confirm.move', { place: formatItem(action.placeId, loc, 'to') })
      case 'accuse':
        return ''
    }
  }

  function confirm() {
    const action = asking
    asking = null
    if (!action) return
    page = 'turn'
    game.act(action)
  }

  function pickSuspect(suspectId: string) {
    if (game.canAct) asking = { type: 'interrogate', suspectId }
    else {
      game.online?.suggest({ kind: 'suspect', id: suspectId })
      page = 'turn'
    }
  }

  function pickPlace(placeId: string) {
    if (game.canAct) asking = { type: 'move', placeId }
    else {
      game.online?.suggest({ kind: 'place', id: placeId })
      page = 'turn'
    }
  }

  function accuse(suspectId: string, placeId: string) {
    page = 'turn'
    if (game.canAct) game.act({ type: 'accuse', suspectId, placeId })
    else game.online?.suggest({ kind: 'pair', suspectId, placeId })
  }
</script>

{#if game.isOver}
  <Reveal {game} {onagain} {onhome} {waitText} />
{:else if game.overlay?.kind === 'clue'}
  <ClueResult {game} overlay={game.overlay} onok={() => game.dismiss()} />
{:else if game.overlay?.kind === 'wrong'}
  <WrongResult {game} overlay={game.overlay} onok={() => game.dismiss()} />
{:else if page === 'notebook'}
  <Notebook {game} onback={() => (page = 'turn')} />
{:else if page === 'suspect'}
  <ChooseSuspect {game} onpick={pickSuspect} onback={() => (page = 'turn')} />
{:else if page === 'place'}
  <ChoosePlace {game} onpick={pickPlace} onback={() => (page = 'turn')} />
{:else if page === 'accuse'}
  <Accuse
    {game}
    mode={game.canAct ? 'act' : 'suggest'}
    onaccuse={accuse}
    onback={() => (page = 'turn')}
  />
{:else}
  <Turn
    {game}
    onask={(action) => (asking = action)}
    onchoose={(what) => (page = what === 'suspect' ? 'suspect' : 'place')}
    onnotebook={() => (page = 'notebook')}
    onaccuse={() => (page = 'accuse')}
    onend={() => (ending = true)}
  />
{/if}

<NoticeBar online={game.online} />

{#if asking}
  <ConfirmDialog
    title={confirmText(asking)}
    text={t('confirm.cost', { duration: duration(game.params.actionMinutes) })}
    onconfirm={confirm}
    oncancel={() => (asking = null)}
  />
{/if}

{#if ending}
  <ConfirmDialog
    title={t('end.title')}
    text={game.online ? t('end.textOnline') : t('end.text')}
    yes={t('end.yes')}
    onconfirm={() => {
      ending = false
      game.end()
    }}
    oncancel={() => (ending = false)}
  />
{/if}
