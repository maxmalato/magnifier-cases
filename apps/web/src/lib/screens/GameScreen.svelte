<script lang="ts">
  // Conduz a partida: vez de alguém, escolhas, confirmação, telas de resultado e revelação.
  import { formatItem } from '@magnifier-cases/content'
  import type { Action } from '@magnifier-cases/engine'
  import type { LocalGame } from '../game/local-game.svelte.ts'
  import ConfirmDialog from '../ui/ConfirmDialog.svelte'
  import Accuse from './Accuse.svelte'
  import ChoosePlace from './ChoosePlace.svelte'
  import ChooseSuspect from './ChooseSuspect.svelte'
  import ClueResult from './ClueResult.svelte'
  import Notebook from './Notebook.svelte'
  import Reveal from './Reveal.svelte'
  import Turn from './Turn.svelte'
  import WrongResult from './WrongResult.svelte'
  import { duration, t, ui } from '../locale.svelte.ts'

  let { game, onagain, onhome }: { game: LocalGame; onagain: () => void; onhome: () => void } =
    $props()

  let page = $state<'turn' | 'suspect' | 'place' | 'notebook' | 'accuse'>('turn')
  let asking = $state<Action | null>(null)

  // a vez de um bot (ou o fim da partida) sempre volta para a tela principal
  $effect(() => {
    if (game.isBotTurn || game.isOver) page = page === 'notebook' ? page : 'turn'
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

  function accuse(suspectId: string, placeId: string) {
    page = 'turn'
    game.act({ type: 'accuse', suspectId, placeId })
  }
</script>

{#if game.isOver}
  <Reveal {game} {onagain} {onhome} />
{:else if game.overlay?.kind === 'clue'}
  <ClueResult {game} overlay={game.overlay} onok={() => game.dismiss()} />
{:else if game.overlay?.kind === 'wrong'}
  <WrongResult {game} overlay={game.overlay} onok={() => game.dismiss()} />
{:else if page === 'notebook'}
  <Notebook {game} onback={() => (page = 'turn')} />
{:else if page === 'suspect'}
  <ChooseSuspect
    {game}
    onpick={(suspectId) => (asking = { type: 'interrogate', suspectId })}
    onback={() => (page = 'turn')}
  />
{:else if page === 'place'}
  <ChoosePlace
    {game}
    onpick={(placeId) => (asking = { type: 'move', placeId })}
    onback={() => (page = 'turn')}
  />
{:else if page === 'accuse'}
  <Accuse {game} onaccuse={accuse} onback={() => (page = 'turn')} />
{:else}
  <Turn
    {game}
    onask={(action) => (asking = action)}
    onchoose={(what) => (page = what === 'suspect' ? 'suspect' : 'place')}
    onnotebook={() => (page = 'notebook')}
    onaccuse={() => (page = 'accuse')}
  />
{/if}

{#if asking}
  <ConfirmDialog
    title={confirmText(asking)}
    text={t('confirm.cost', { duration: duration(game.params.actionMinutes) })}
    onconfirm={confirm}
    oncancel={() => (asking = null)}
  />
{/if}
