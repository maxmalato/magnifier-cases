<script lang="ts">
  // Vez de alguém: mapa, menu de ações (com motivo quando bloqueada), caderno e acusação.
  import { formatItem } from '@magnifier-cases/content'
  import type { Action } from '@magnifier-cases/engine'
  import type { GameController } from '../game/controller.ts'
  import ActionSegments from '../ui/ActionSegments.svelte'
  import SuggestionList from '../ui/SuggestionList.svelte'
  import Header from '../ui/Header.svelte'
  import Icon from '../ui/Icon.svelte'
  import PlaceGrid from '../ui/PlaceGrid.svelte'
  import { duration, t, tn, ui } from '../locale.svelte.ts'

  let {
    game,
    onask,
    onchoose,
    onnotebook,
    onaccuse,
  }: {
    game: GameController
    /** Pede confirmação de uma ação que gasta tempo. */
    onask: (action: Action) => void
    onchoose: (what: 'suspect' | 'place') => void
    onnotebook: () => void
    onaccuse: () => void
  } = $props()

  const view = $derived(game.view)
  const minutes = $derived(duration(view.params.actionMinutes))
  /** Este aparelho joga agora. */
  const human = $derived(game.canAct)
  /** Online, fora da própria vez: os botões viram sugestões (opinar). */
  const suggesting = $derived(!game.canAct && !game.isBotTurn && (game.online?.canSuggest ?? false))
  /** Acabaram as trocas de sugestão desta jogada (o limite fica visível, nunca em silêncio). */
  const exhausted = $derived(suggesting && (game.online?.suggestionsLeft ?? 0) <= 0)
  /** Pode sugerir agora (fora da vez e ainda com trocas). */
  const canPropose = $derived(suggesting && !exhausted)
  const mine = $derived(game.online?.mySuggestion ?? null)
  const suggested = (option: 'investigate' | 'interrogate' | 'move' | 'accuse') =>
    mine?.kind === 'option' && mine.option === option

  /** Na vez: faz a ação; fora dela (online): sugere a opção. */
  function choose(option: 'investigate' | 'interrogate' | 'move', run: () => void) {
    if (human) run()
    else if (canPropose) game.online?.suggest({ kind: 'option', option })
  }
  const here = $derived(view.teamAt)
  const hereClosed = $derived(
    here !== 'square' &&
      view.unopened.some((u) => u.source.type === 'place' && u.source.id === here),
  )
  const anyoneToAsk = $derived(view.unopened.some((u) => u.source.type === 'suspect'))
  let hintText = $state<string | null>(null)

  // a dica vale só para esta vez
  $effect(() => {
    void view.turn
    hintText = null
  })

  function showHint() {
    const decision = game.hint()
    if (!decision) return
    const a = decision.action
    const loc = ui.locale
    hintText =
      a.type === 'interrogate'
        ? t('hint.interrogate', { name: formatItem(a.suspectId, loc) })
        : a.type === 'investigate'
          ? t('hint.investigate', { place: formatItem(here, loc) })
          : a.type === 'move'
            ? t('hint.move', { place: formatItem(a.placeId, loc, 'to') })
            : t('hint.accuse', {
                suspect: formatItem(a.suspectId, loc),
                place: formatItem(a.placeId, loc, 'in'),
              })
  }
</script>

<main class="screen">
  <Header clock={view.clock} />
  <ActionSegments
    total={view.params.actionsTotal}
    left={view.actionsLeft}
    deadline={view.params.deadline}
  />

  <div class="who">
    <h1>{t('turn.of', { name: game.active.name })}</h1>
    {#if human}
      <p>{t('turn.teamAt', { place: formatItem(here, ui.locale, 'in') })}</p>
    {:else if game.isBotTurn}
      <p role="status" aria-live="polite">{t('turn.botThinking', { name: game.active.name })}</p>
    {:else if suggesting}
      <p role="status" aria-live="polite">{t('suggest.hint', { name: game.active.name })}</p>
      {#if exhausted}
        <p class="limit" role="status">
          {t('suggest.none', { n: game.online?.suggestionLimit ?? 0 })}
        </p>
      {:else}
        <p class="left">{tn('suggest.left', game.online?.suggestionsLeft ?? 0)}</p>
      {/if}
    {/if}
  </div>

  <SuggestionList online={game.online} />

  {#if game.lastMove}
    <p class="moved" role="status" aria-live="polite">
      {t('turn.moved', {
        name: game.lastMove.seat.name,
        place: formatItem(game.lastMove.placeId, ui.locale, 'to'),
      })}
    </p>
  {/if}

  <section aria-label={t('turn.map')}>
    <PlaceGrid
      {view}
      onpick={human
        ? (placeId) => onask({ type: 'move', placeId })
        : canPropose
          ? (placeId) => game.online?.suggest({ kind: 'place', id: placeId })
          : undefined}
    />
  </section>

  <div class="card menu">
    <button
      type="button"
      class="option"
      disabled={suggesting ? exhausted : !human || !hereClosed}
      aria-pressed={suggesting ? suggested('investigate') : undefined}
      onclick={() => choose('investigate', () => onask({ type: 'investigate' }))}
    >
      <Icon name="search" size={26} />
      <span class="option-text">
        <span class="option-title">
          {here === 'square'
            ? t('action.investigateSquare')
            : t('action.investigate', { place: formatItem(here, ui.locale) })}
        </span>
        <span class="option-sub">
          {here !== 'square' && !hereClosed
            ? t('action.investigateDone')
            : t('action.investigateSub', { duration: minutes })}
        </span>
      </span>
    </button>
    <button
      type="button"
      class="option"
      disabled={(!human && !canPropose) || !anyoneToAsk}
      onclick={() => onchoose('suspect')}
    >
      <Icon name="chat" size={26} />
      <span class="option-text">
        <span class="option-title">{t('action.interrogate')}</span>
        <span class="option-sub">
          {anyoneToAsk
            ? t('action.interrogateSub', { duration: minutes })
            : t('action.interrogateNone')}
        </span>
      </span>
    </button>
    <button
      type="button"
      class="option"
      disabled={!human && !canPropose}
      aria-pressed={suggesting ? suggested('move') : undefined}
      onclick={() => choose('move', () => onchoose('place'))}
    >
      <Icon name="arrow" size={26} />
      <span class="option-text">
        <span class="option-title">{t('action.move')}</span>
        <span class="option-sub">{t('action.moveSub', { duration: minutes })}</span>
      </span>
    </button>
  </div>

  {#if human && view.actionsLeft === 1}
    <p class="last" role="status">{t('turn.lastAction')}</p>
  {/if}

  {#if human && view.params.suggestEnabled}
    <button type="button" class="btn" onclick={showHint}>{t('turn.hint')}</button>
    {#if hintText}<p class="hint" role="status" aria-live="polite">{hintText}</p>{/if}
  {/if}

  <div class="row">
    <button type="button" class="btn" onclick={onnotebook}>{t('turn.notebook')}</button>
    <button type="button" class="btn" disabled={!human && !canPropose} onclick={onaccuse}>
      {t('turn.accuse')}
    </button>
  </div>
</main>

<style>
  .who h1 {
    font-size: 1.875rem;
  }
  .who p {
    margin: 2px 0 0;
    color: var(--text-soft);
  }
  .limit,
  .left {
    margin: 4px 0 0;
    font-weight: 800;
  }
  .limit {
    padding: 10px 12px;
    border-radius: 12px;
    border: 2px solid var(--accent-text);
  }
  .moved,
  .last,
  .hint {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--panel);
    font-weight: 700;
  }
  .last {
    border: 2px solid var(--accent-text);
  }
  .menu {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .option {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    padding: 8px 14px;
    border-radius: 14px;
    border: 2px solid var(--card-muted);
    background: transparent;
    color: var(--card-ink);
    text-align: left;
  }
  .option:not(:disabled):hover {
    border-color: var(--card-ink);
  }
  .option:disabled {
    opacity: 0.6;
  }
  .option[aria-pressed='true'] {
    border: 3px solid var(--accent-text);
    background: var(--accent);
    color: var(--accent-ink);
  }
  .option-text {
    display: flex;
    flex-direction: column;
  }
  .option-title {
    font-size: 1.0625rem;
    font-weight: 800;
    line-height: 1.15;
  }
  .option-sub {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--card-muted);
  }
  .row {
    display: flex;
    gap: 10px;
  }
  .row .btn {
    flex: 1;
  }
</style>
