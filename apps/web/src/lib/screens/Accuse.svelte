<script lang="ts">
  // Acusação: um suspeito e um lugar. Itens descartados ficam bloqueados com o motivo; a dupla
  // já acusada também. O texto da regra vem dos dados do nível (nada fixo na tela).
  import { formatItem, nameOf, themeText } from '@magnifier-cases/content'
  import type { GameController } from '../game/controller.ts'
  import Header from '../ui/Header.svelte'
  import Icon from '../ui/Icon.svelte'
  import { duration, t, ui } from '../locale.svelte.ts'

  let {
    game,
    mode = 'act',
    onaccuse,
    onback,
  }: {
    game: GameController
    /** act: acusar de verdade; suggest: sugerir a dupla (online, fora da própria vez). */
    mode?: 'act' | 'suggest'
    onaccuse: (suspectId: string, placeId: string) => void
    onback: () => void
  } = $props()

  const view = $derived(game.view)
  let suspect = $state<string | null>(null)
  let place = $state<string | null>(null)
  const tried = $derived(
    suspect !== null &&
      place !== null &&
      view.wrongAccusations.some((w) => w.suspectId === suspect && w.placeId === place),
  )
  const errorEnds = $derived(view.actionsLeft <= view.params.wrongAccusationCost)
  const errorMinutes = $derived(view.params.wrongAccusationCost * view.params.actionMinutes)
</script>

{#snippet options(
  ids: readonly string[],
  open: readonly string[],
  chosen: string | null,
  pick: (id: string) => void,
  legend: string,
)}
  <fieldset>
    <legend class="label">{legend}</legend>
    <div class="grid">
      {#each ids as id (id)}
        {@const off = !open.includes(id)}
        <button
          type="button"
          class="opt"
          class:chosen={chosen === id}
          disabled={off}
          aria-pressed={chosen === id}
          onclick={() => pick(id)}
        >
          <span class="opt-name" class:struck={off}>{nameOf(id, ui.locale)}</span>
          {#if off}<span class="opt-note">{t('accuse.discarded')}</span>{/if}
          {#if chosen === id}<span class="check"><Icon name="check" size={20} /></span>{/if}
        </button>
      {/each}
    </div>
  </fieldset>
{/snippet}

<main class="screen">
  <Header clock={view.clock} />
  <h1>{themeText('theme.accuseQuestion', ui.locale)}</h1>
  <p class="sub">{t('accuse.subtitle', { name: game.active.name })}</p>

  {@render options(
    view.cast.suspects,
    view.candidates.suspects,
    suspect,
    (id) => (suspect = id),
    t('accuse.suspect'),
  )}
  {@render options(
    view.cast.places,
    view.candidates.places,
    place,
    (id) => (place = id),
    t('accuse.place'),
  )}

  <p class="card rule">
    {errorEnds ? t('accuse.ruleLast') : t('accuse.rule', { duration: duration(errorMinutes) })}
  </p>
  {#if tried}<p class="tried" role="alert">{t('accuse.tried')}</p>{/if}

  <button
    type="button"
    class="btn btn-primary"
    disabled={suspect === null || place === null || tried}
    onclick={() => suspect && place && onaccuse(suspect, place)}
  >
    {mode === 'suggest'
      ? t('suggest.pair')
      : suspect && place
        ? t('accuse.button', {
            suspect: formatItem(suspect, ui.locale),
            place: formatItem(place, ui.locale, 'in'),
          })
        : t('accuse.choose')}
  </button>
  <button type="button" class="btn" onclick={onback}>{t('accuse.back')}</button>
</main>

<style>
  h1 {
    font-size: 1.75rem;
  }
  .sub {
    margin: 0;
    color: var(--text-muted);
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }
  legend {
    margin-bottom: 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }
  .opt {
    position: relative;
    min-height: 56px;
    padding: 8px 36px 8px 14px;
    border-radius: 14px;
    border: 2px solid var(--outline);
    background: transparent;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: flex-start;
    text-align: left;
    font-weight: 800;
  }
  .opt:disabled {
    border-style: dashed;
    background: var(--panel);
  }
  .opt.chosen {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  .opt-note {
    font-size: 0.8125rem;
    color: var(--off);
  }
  .check {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
  }
  .rule {
    margin: 0;
    padding: 14px 16px;
    font-size: 1rem;
  }
  .tried {
    margin: 0;
    font-weight: 800;
  }
</style>
