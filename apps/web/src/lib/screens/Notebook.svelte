<script lang="ts">
  // Caderno do detetive: derivado das pistas abertas (nunca guardado à parte). Só dois estados
  // por item (possível ou descartado) e a marca "um dos N" das pistas de grupo. O estado nunca
  // depende só de cor: riscado + tarja.
  import { nameOf, renderClue } from '@magnifier-cases/content'
  import type { NotebookEntry } from '@magnifier-cases/engine'
  import type { GameController } from '../game/controller.ts'
  import Header from '../ui/Header.svelte'
  import { t, ui } from '../locale.svelte.ts'

  let { game, onback }: { game: GameController; onback: () => void } = $props()
  const view = $derived(game.view)

  function groupSize(entry: NotebookEntry): number | null {
    const id = entry.inGroupOf.at(-1)
    const card = view.opened.find((c) => c.id === id)
    return card && 'ids' in card.effect ? card.effect.ids.length : null
  }
</script>

{#snippet entries(list: readonly NotebookEntry[], title: string, id: string)}
  <section class="panel" aria-labelledby={id}>
    <h2 {id} class="label">{title}</h2>
    <ul>
      {#each list as entry (entry.id)}
        {@const size = entry.status === 'open' ? groupSize(entry) : null}
        <li>
          <span class:struck={entry.status === 'eliminated'}>{nameOf(entry.id, ui.locale)}</span>
          {#if entry.status === 'eliminated'}
            <span class="badge badge-off">{t('notebook.discarded')}</span>
          {:else if size}
            <span class="badge badge-group">{t('notebook.oneOf', { n: size })}</span>
          {:else}
            <span class="badge">{t('notebook.open')}</span>
          {/if}
        </li>
      {/each}
    </ul>
  </section>
{/snippet}

<main class="screen">
  <Header clock={view.clock} />
  <h1>{t('notebook.title')}</h1>
  <p class="sub">{t('notebook.subtitle', { name: game.active.name })}</p>

  {@render entries(view.notebook.suspects, t('notebook.suspects'), 'nb-suspects')}
  {@render entries(view.notebook.places, t('notebook.places'), 'nb-places')}

  <section class="card" aria-labelledby="nb-clues">
    <h2 id="nb-clues" class="label">{t('notebook.clues')}</h2>
    {#if view.opened.length === 0}
      <p class="empty">{t('notebook.noClues')}</p>
    {:else}
      <ol class="clues">
        {#each view.opened as card (card.id)}
          <li>{renderClue(card, ui.locale)}</li>
        {/each}
      </ol>
    {/if}
  </section>

  <button
    type="button"
    class="btn btn-primary"
    class:guided={game.guide?.includes('notebook-back')}
    onclick={onback}
  >
    {t('notebook.back')}
  </button>
</main>

<style>
  h1 {
    font-size: 1.875rem;
  }
  .sub {
    margin: 0;
    color: var(--text-muted);
  }
  ul {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-weight: 800;
    font-size: 1.0625rem;
  }
  .clues {
    margin: 8px 0 0;
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .clues li {
    display: list-item;
    font-weight: 700;
    font-size: 1rem;
  }
  .empty {
    margin: 8px 0 0;
  }
</style>
