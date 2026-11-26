<script lang="ts">
  // Sugestões da equipe (opinar): cada jogador tem uma ativa; somem quando a vez muda.
  import type { OnlineControls } from '../game/controller.ts'
  import { suggestionText } from '../text.ts'
  import { t, ui } from '../locale.svelte.ts'

  let { online }: { online: OnlineControls | undefined } = $props()
</script>

{#if online && online.suggestions.length > 0}
  <section class="panel" aria-labelledby="suggestions-title" aria-live="polite">
    <h2 id="suggestions-title" class="label">{t('suggest.title')}</h2>
    <ul>
      {#each online.suggestions as s (s.seat.id)}
        <li class:mine={s.seat.id === online.mySeat}>
          {t('suggest.by', { name: s.seat.name, what: suggestionText(s.target, ui.locale) })}
        </li>
      {/each}
    </ul>
    {#if online.mySuggestion}
      <button type="button" class="btn small" onclick={() => online.unsuggest()}>
        {t('suggest.remove')}
      </button>
    {/if}
  </section>
{/if}

<style>
  ul {
    list-style: none;
    margin: 8px 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-weight: 700;
  }
  .mine {
    text-decoration: underline;
    text-decoration-color: var(--accent-text);
    text-decoration-thickness: 3px;
  }
  .small {
    min-height: 44px;
  }
</style>
