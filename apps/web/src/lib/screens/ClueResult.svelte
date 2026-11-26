<script lang="ts">
  // Nova pista ou depoimento. "OK" só fecha esta tela neste aparelho: o estado já mudou e a
  // pista fica no caderno.
  import { formatItem, nameOf, renderClue, titleOf } from '@magnifier-cases/content'
  import type { LocalGame, Overlay } from '../game/local-game.svelte.ts'
  import ActionSegments from '../ui/ActionSegments.svelte'
  import Avatar from '../ui/Avatar.svelte'
  import Header from '../ui/Header.svelte'
  import { effectSummary } from '../text.ts'
  import { t, ui } from '../locale.svelte.ts'

  let {
    game,
    overlay,
    onok,
  }: { game: LocalGame; overlay: Extract<Overlay, { kind: 'clue' }>; onok: () => void } = $props()
  const view = $derived(game.view)
  const card = $derived(overlay.card)
  let okButton: HTMLButtonElement | undefined = $state()
  $effect(() => okButton?.focus())
</script>

<main class="screen">
  <Header clock={view.clock} />
  <ActionSegments
    total={view.params.actionsTotal}
    left={view.actionsLeft}
    deadline={view.params.deadline}
  />

  <div role="status" aria-live="polite" class="live">
    <p class="who">
      {overlay.via === 'investigate'
        ? t('result.investigated', {
            name: overlay.seat.name,
            place: formatItem(card.source.id, ui.locale),
          })
        : t('result.interrogated', { name: overlay.seat.name })}
    </p>

    {#if overlay.via === 'interrogate'}
      <div class="speaker">
        <Avatar name={nameOf(card.source.id, ui.locale)} />
        <div>
          <span class="label">{t('result.testimony')}</span>
          <h1>{titleOf(card.source.id, ui.locale)}</h1>
        </div>
      </div>
    {/if}

    <article class="card clue">
      <span class="label">
        {t('result.clue', { n: overlay.number, source: nameOf(card.source.id, ui.locale) })}
      </span>
      <p class="text">
        {overlay.via === 'interrogate'
          ? `“${renderClue(card, ui.locale)}”`
          : renderClue(card, ui.locale)}
      </p>
      <hr />
      <span class="label">{t('result.shows')}</span>
      <p class="shows">{effectSummary(card.effect, ui.locale)}</p>
    </article>
  </div>

  {#if overlay.changes.length > 0}
    <section class="panel changes" aria-labelledby="changes-title">
      <h2 id="changes-title" class="label">{t('result.notebookUpdated')}</h2>
      <ul>
        {#each overlay.changes as change (change.id)}
          <li>
            <span class:struck={change.change === 'discarded'}>{nameOf(change.id, ui.locale)}</span>
            {#if change.change === 'discarded'}
              <span class="badge badge-off">{t('notebook.discarded')}</span>
            {:else}
              <span class="badge badge-group">
                {t('notebook.oneOf', { n: change.groupSize ?? 2 })}
              </span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <div class="foot">
    <p>{t('result.readTogether')}</p>
    {#if overlay.next}<p>{t('result.next', { name: overlay.next.name })}</p>{/if}
  </div>

  <button type="button" class="btn btn-primary ok" bind:this={okButton} onclick={onok}>
    {t('app.ok')}
  </button>
</main>

<style>
  .live {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .who {
    margin: 0;
    font-weight: 700;
    color: var(--text-soft);
  }
  .speaker {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .speaker h1 {
    font-size: 1.5rem;
  }
  .clue {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .text {
    margin: 0;
    font-family: var(--font-title);
    font-weight: 500;
    font-size: 1.5rem;
    line-height: 1.25;
  }
  hr {
    width: 100%;
    border: 0;
    height: 2px;
    background: var(--card-line);
    margin: 4px 0;
  }
  .shows {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
  }
  .changes ul {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .changes li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-weight: 800;
  }
  .foot p {
    margin: 0;
    color: var(--text-muted);
    font-weight: 700;
  }
  .ok {
    margin-top: auto;
  }
</style>
