<script lang="ts">
  // Barra de ações: um segmento por ação do nível (vem dos dados, nunca fixo em 8).
  import { tn } from '../locale.svelte.ts'

  let { total, left, deadline }: { total: number; left: number; deadline: string } = $props()
  const used = $derived(Math.max(0, total - left))
</script>

<div class="segments">
  <div class="bar" aria-hidden="true">
    {#each Array.from({ length: total }, (_, i) => i) as i (i)}
      <span class="seg" class:used={i < used}></span>
    {/each}
  </div>
  <span class="text">{tn('clock.left', left, { deadline })}</span>
</div>

<style>
  .segments {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .bar {
    display: flex;
    gap: 4px;
  }
  .seg {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: var(--panel-2);
  }
  .seg.used {
    background: var(--accent);
  }
  .text {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-muted);
  }
</style>
