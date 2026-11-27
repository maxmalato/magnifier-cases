<script lang="ts">
  // Botão "Como jogar", ao lado do Som: "?" no celular e o nome por extenso a partir do tablet.
  // Abre a partida de treino. Some durante o próprio treino.
  import { t } from '../locale.svelte.ts'
  import { howToPlay } from '../tutorial/launcher.svelte.ts'
</script>

{#if !howToPlay.open}
  <button
    type="button"
    class="howto"
    aria-label={t('howto.button')}
    onclick={() => (howToPlay.open = true)}
  >
    <span class="short" aria-hidden="true">?</span>
    <span class="long" aria-hidden="true">{t('howto.button')}</span>
  </button>
{/if}

<style>
  .howto {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0 12px;
    border-radius: 999px;
    border: 2px solid var(--accent);
    background: var(--panel);
    color: var(--text);
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
  .short {
    font-size: 1.25rem;
    line-height: 1;
  }
  .long {
    display: none;
  }
  @media (min-width: 768px) {
    .short {
      display: none;
    }
    .long {
      display: inline;
    }
  }
</style>
