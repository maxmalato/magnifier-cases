<script lang="ts">
  // Acusação errada: diz só que a dupla está errada, sem dizer qual metade, e quanto custou.
  import { formatItem } from '@magnifier-cases/content'
  import type { LocalGame, Overlay } from '../game/local-game.svelte.ts'
  import ActionSegments from '../ui/ActionSegments.svelte'
  import Header from '../ui/Header.svelte'
  import { duration, t, ui } from '../locale.svelte.ts'

  let {
    game,
    overlay,
    onok,
  }: { game: LocalGame; overlay: Extract<Overlay, { kind: 'wrong' }>; onok: () => void } = $props()
  const view = $derived(game.view)
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
  <div class="card" role="status" aria-live="polite">
    <h1>{t('wrong.title')}</h1>
    <p>
      {t('wrong.text', {
        name: overlay.seat.name,
        suspect: formatItem(overlay.suspectId, ui.locale),
        place: formatItem(overlay.placeId, ui.locale, 'in'),
      })}
    </p>
    <p>{t('wrong.which')}</p>
    <p class="cost">{t('wrong.cost', { duration: duration(overlay.minutes) })}</p>
  </div>
  {#if overlay.next}<p class="next">{t('result.next', { name: overlay.next.name })}</p>{/if}
  <button type="button" class="btn btn-primary ok" bind:this={okButton} onclick={onok}>
    {t('app.ok')}
  </button>
</main>

<style>
  h1 {
    font-size: 1.75rem;
  }
  .card p {
    margin: 10px 0 0;
    font-size: 1.0625rem;
  }
  .cost {
    font-weight: 800;
  }
  .next {
    margin: 0;
    color: var(--text-muted);
  }
  .ok {
    margin-top: auto;
  }
</style>
