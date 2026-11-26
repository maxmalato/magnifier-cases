<script lang="ts">
  import { titleOf } from '@magnifier-cases/content'
  import type { GameController } from '../game/controller.ts'
  import Header from '../ui/Header.svelte'
  import { t, ui } from '../locale.svelte.ts'

  let {
    game,
    onpick,
    onback,
  }: { game: GameController; onpick: (suspectId: string) => void; onback: () => void } = $props()

  const view = $derived(game.view)
  const closed = (id: string) =>
    view.unopened.some((u) => u.source.type === 'suspect' && u.source.id === id)
</script>

<main class="screen">
  <Header clock={view.clock} />
  <h1>{t('choose.suspectTitle')}</h1>
  <ul class="list">
    {#each view.cast.suspects as id (id)}
      {@const open = view.candidates.suspects.includes(id)}
      <li>
        <button type="button" class="item" disabled={!closed(id)} onclick={() => onpick(id)}>
          <span class:struck={!open}>{titleOf(id, ui.locale)}</span>
          {#if !closed(id)}
            <span class="badge">{t('choose.alreadyAsked')}</span>
          {:else if !open}
            <span class="badge badge-off">{t('notebook.discarded')}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
  <button type="button" class="btn" onclick={onback}>{t('app.back')}</button>
</main>

<style>
  h1 {
    font-size: 1.75rem;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .item {
    width: 100%;
    min-height: 56px;
    padding: 8px 14px;
    border-radius: 14px;
    border: 2px solid var(--outline);
    background: var(--panel);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    text-align: left;
    font-weight: 800;
    font-size: 1.0625rem;
  }
  .item:disabled {
    opacity: 0.7;
  }
</style>
