<script lang="ts">
  // Mapa do bairro: grade com os lugares do nível e a Praça. Só visual (sem vizinhança): ir de
  // qualquer lugar a qualquer lugar custa o mesmo. 3 colunas até 9 células; 4 com 10 lugares.
  import { nameOf } from '@magnifier-cases/content'
  import type { PublicView } from '@magnifier-cases/engine'
  import { t, ui } from '../locale.svelte.ts'

  let {
    view,
    onpick,
    large = false,
  }: {
    view: PublicView
    onpick?: ((placeId: string) => void) | undefined
    /** Tamanho da tela da mesa (TV, notebook ou tablet). */
    large?: boolean
  } = $props()

  const cells = $derived.by(() => {
    const all = [...view.cast.places]
    // a Praça fica no meio da grade (no centro do 3 × 3 quando há 6 ou 8 lugares)
    const middle = all.length >= 6 && all.length <= 8 ? 4 : Math.floor(all.length / 2)
    all.splice(middle, 0, 'square')
    return all
  })
  const columns = $derived(cells.length <= 9 ? 3 : 4)

  function status(id: string): { note: string; kind: 'here' | 'off' | 'plain' } {
    if (view.teamAt === id) return { note: t('turn.here'), kind: 'here' }
    if (id === 'square') return { note: t('turn.start'), kind: 'plain' }
    if (!view.candidates.places.includes(id)) return { note: t('turn.discarded'), kind: 'off' }
    const closed = view.unopened.some((u) => u.source.type === 'place' && u.source.id === id)
    return { note: closed ? t('turn.clueClosed') : t('turn.clueOpen'), kind: 'plain' }
  }
</script>

<div class="grid" class:large style:grid-template-columns="repeat({columns}, minmax(0, 1fr))">
  {#each cells as id (id)}
    {@const s = status(id)}
    {@const name = nameOf(id, ui.locale)}
    {#if onpick && id !== 'square' && s.kind !== 'here'}
      <button
        type="button"
        class="tile {s.kind}"
        onclick={() => onpick(id)}
        aria-label="{name}: {s.note}"
      >
        <span class="name" class:struck={s.kind === 'off'}>{name}</span>
        <span class="note">{s.note}</span>
      </button>
    {:else}
      <div class="tile {s.kind}" aria-label="{name}: {s.note}" role="group">
        <span class="name" class:struck={s.kind === 'off'}>{name}</span>
        <span class="note">{s.note}</span>
      </div>
    {/if}
  {/each}
</div>

<style>
  .grid {
    display: grid;
    gap: 8px;
  }
  .tile {
    min-height: 72px;
    border-radius: 12px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-start;
    text-align: left;
    border: 2px solid transparent;
    background: var(--panel-2);
    color: var(--text);
  }
  .tile.here {
    background: var(--card);
    color: var(--card-ink);
    border: 3px solid var(--accent);
  }
  .tile.off {
    background: var(--panel);
    border: 2px dashed var(--outline);
  }
  .name {
    font-family: var(--font-title);
    font-weight: 600;
    font-size: 1rem;
    line-height: 1.1;
  }
  .note {
    font-size: 0.875rem;
    font-weight: 800;
    color: var(--text-soft);
  }
  .tile.here .note {
    color: var(--card-muted);
  }
  .tile.off .note {
    color: var(--off);
  }
  .large {
    gap: 12px;
  }
  .large .tile {
    min-height: 108px;
    border-radius: 16px;
    padding: 12px 14px;
  }
  .large .name {
    font-size: 1.375rem;
  }
  .large .note {
    font-size: 1rem;
  }
  button.tile:hover {
    border-color: var(--accent);
  }
</style>
