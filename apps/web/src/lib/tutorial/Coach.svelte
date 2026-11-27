<script lang="ts">
  // Painel do treinador: fica fixo embaixo da tela durante a partida de treino e diz o que fazer
  // em cada passo. O botão certo fica destacado na tela; o resto não vale no treino.
  import { formatItem } from '@magnifier-cases/content'
  import { duration, t, ui } from '../locale.svelte.ts'
  import type { MessageKey } from '../../i18n.ts'
  import type { TutorialGame } from './tutorial-game.svelte.ts'

  let { game, onexit }: { game: TutorialGame; onexit: () => void } = $props()

  const step = $derived(game.step)
  let panel: HTMLElement | undefined = $state()

  /**
   * Leva à vista o próximo botão destacado (o primeiro ainda não escolhido), acima do painel.
   * Roda quando o passo ou a tela mudam e depois de cada toque.
   */
  function reveal() {
    requestAnimationFrame(() => {
      const target = [...document.querySelectorAll<HTMLElement>('.guided')].find(
        (el) =>
          !panel?.contains(el) &&
          el.getAttribute('aria-pressed') !== 'true' &&
          !(el as HTMLButtonElement).disabled &&
          el.getClientRects().length > 0,
      )
      if (!target || target.closest('dialog')) return
      const visible = window.innerHeight - (panel?.offsetHeight ?? 0)
      const rect = target.getBoundingClientRect()
      if (rect.top >= 8 && rect.bottom <= visible - 8) return
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollBy({
        top: rect.top - Math.max(8, (visible - rect.height) / 2),
        behavior: reduce ? 'auto' : 'smooth',
      })
    })
  }
  $effect(() => {
    void game.index
    void game.overlay
    reveal()
  })
  $effect(() => {
    const onClick = () => reveal()
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  })
  const text = $derived(
    t(`tutorial.${step.key}` as MessageKey, {
      suspect: step.suspect ? formatItem(step.suspect, ui.locale) : '',
      place: step.place ? formatItem(step.place, ui.locale) : '',
      duration: duration(game.params.actionMinutes),
      deadline: game.params.deadline,
    }),
  )
</script>

<aside class="coach" aria-labelledby="coach-title" bind:this={panel}>
  <div class="inner">
    <p class="top">
      <span id="coach-title" class="label">{t('tutorial.title')}</span>
      <span class="count">
        {t('tutorial.step', { n: game.index + 1, total: game.script.length })}
      </span>
    </p>
    <p class="text" role="status" aria-live="polite">{text}</p>
    {#if game.warning}
      <p class="warning" role="alert">{t('tutorial.wrong')}</p>
    {/if}
    <div class="row">
      <button type="button" class="btn" onclick={onexit}>{t('tutorial.exit')}</button>
      {#if step.kind === 'info'}
        <button type="button" class="btn btn-primary guided" onclick={() => game.next()}>
          {t('tutorial.next')}
        </button>
      {:else if step.kind === 'ok' && game.overlay}
        <!-- o OK da tela da pista pode ficar atrás do painel: o painel repete o botão -->
        <button type="button" class="btn btn-primary guided" onclick={() => game.dismiss()}>
          {t('app.ok')}
        </button>
      {/if}
    </div>
  </div>
</aside>

<style>
  .coach {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 20;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: var(--card);
    color: var(--card-ink);
    border-top: 3px solid var(--accent);
    box-shadow: 0 -6px 18px rgb(0 0 0 / 0.18);
  }
  .inner {
    max-width: 560px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .top {
    margin: 0;
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  /* o painel é claro nos dois temas (como os cartões): rótulos com a cor dos cartões */
  .coach .label {
    color: var(--card-muted);
  }
  .count {
    font-weight: 700;
    color: var(--card-muted);
  }
  .text {
    margin: 0;
    font-size: 1.0625rem;
    font-weight: 700;
  }
  .warning {
    margin: 0;
    padding: 6px 10px;
    border-radius: 10px;
    border: 2px dashed var(--accent-text);
    font-weight: 800;
  }
  .row {
    display: flex;
    gap: 10px;
  }
  .row .btn {
    flex: 1;
  }
</style>
