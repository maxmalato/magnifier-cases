<script lang="ts">
  // Avisos do online, numa faixa fixa que aparece em qualquer tela da partida: alguém caiu, o
  // bot assumiu, alguém voltou; e a própria conexão caindo.
  import type { OnlineControls } from '../game/controller.ts'
  import { t } from '../locale.svelte.ts'

  let {
    online,
    placement = 'bottom',
  }: {
    online: OnlineControls | undefined
    /** Na mesa, os avisos ficam no topo para não cobrir a faixa dos jogadores. */
    placement?: 'bottom' | 'top'
  } = $props()
</script>

<div class="notices {placement}" role="status" aria-live="polite">
  {#if online?.reconnecting}<p class="notice warn">{t('online.reconnecting')}</p>{/if}
  {#if online?.error}<p class="notice warn">{online.error}</p>{/if}
  {#each online?.notices ?? [] as notice, i (i)}<p class="notice">{notice}</p>{/each}
</div>

<style>
  .notices {
    position: fixed;
    left: 16px;
    right: 16px;
    max-width: 528px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    z-index: 10;
    pointer-events: none;
  }
  .bottom {
    bottom: 16px;
  }
  .top {
    top: 16px;
  }
  .notice {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--card);
    color: var(--card-ink);
    border: 2px solid var(--outline);
    font-weight: 800;
    box-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
  }
  .warn {
    border-color: var(--accent-text);
  }
</style>
