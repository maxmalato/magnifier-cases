<script lang="ts">
  // Revelação (vitória ou tempo esgotado): solução, as pistas que bastavam (conjunto de custo
  // mínimo do solucionador) e a dica gerada delas. Sem punição.
  import { formatList, nameOf, renderClue, themeText } from '@magnifier-cases/content'
  import type { GameController } from '../game/controller.ts'
  import Avatar from '../ui/Avatar.svelte'
  import Header from '../ui/Header.svelte'
  import { t, ui } from '../locale.svelte.ts'

  let {
    game,
    onagain,
    onhome,
    waitText,
  }: {
    game: GameController
    /** Novo mistério; ausente no online para quem não comanda a sala. */
    onagain?: (() => void) | undefined
    onhome: () => void
    /** Texto de espera no lugar do botão de novo mistério. */
    waitText?: string | undefined
  } = $props()
  const view = $derived(game.view)
  const reveal = $derived(view.reveal)
  const won = $derived(view.phase === 'won')
</script>

<main class="screen">
  <Header clock={view.clock} />
  {#if reveal}
    <div class="top" role="status" aria-live="polite">
      <Avatar name={nameOf(reveal.solution.culpritId, ui.locale)} size={96} />
      <span class="label">{won ? t('reveal.solved') : t('reveal.timeout')}</span>
      {#if !won}<p class="lead">{themeText('theme.timeoutTitle', ui.locale)}</p>{/if}
      <h1>
        {themeText('theme.revealCulprit', ui.locale, { culprit: [reveal.solution.culpritId] })}
      </h1>
      <p class="lead">
        {themeText('theme.revealHideout', ui.locale, { hideout: [reveal.solution.hideoutId] })}
      </p>
    </div>

    <section class="card" aria-labelledby="key-clues">
      <h2 id="key-clues" class="label">{t('reveal.keyClues')}</h2>
      <ol>
        {#each reveal.keyCards as card (card.id)}
          <li>
            {renderClue(card, ui.locale)}
            {#if !card.opened}<span class="not-opened">({t('reveal.notOpened')})</span>{/if}
          </li>
        {/each}
      </ol>
      <p class="hint">
        {t('reveal.hint', {
          list: formatList(
            reveal.keyCards.map((c) => c.source.id),
            ui.locale,
            'of',
          ),
        })}
      </p>
    </section>

    {#if won}
      <div class="stats">
        <div class="stat"><strong>{view.clock}</strong><span>{t('reveal.solvedAt')}</span></div>
        <div class="stat">
          <strong>{view.actionsLeft}</strong><span>{t('reveal.actionsLeft')}</span>
        </div>
        <div class="stat">
          <strong>{view.opened.length}</strong><span>{t('reveal.cluesUsed')}</span>
        </div>
      </div>
    {:else}
      <p class="no-blame">{t('reveal.noBlame')}</p>
    {/if}
  {/if}

  {#if onagain}
    <button type="button" class="btn btn-primary" onclick={onagain}>
      {t('reveal.newMystery')}
    </button>
  {:else if waitText}
    <p class="no-blame" role="status">{waitText}</p>
  {/if}
  <button type="button" class="btn" onclick={onhome}>{t('reveal.home')}</button>
</main>

<style>
  .top {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
  }
  h1 {
    font-size: 2.25rem;
  }
  .lead {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
  }
  ol {
    margin: 10px 0 0;
    padding-left: 22px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-weight: 700;
  }
  .not-opened {
    color: var(--card-muted);
    font-weight: 600;
  }
  .hint {
    margin: 12px 0 0;
    font-weight: 700;
    color: var(--card-muted);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .stat {
    background: var(--panel);
    border-radius: 14px;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .stat strong {
    font-family: var(--font-title);
    font-size: 1.75rem;
    color: var(--accent-text);
  }
  .stat span {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
  .no-blame {
    margin: 0;
    text-align: center;
    color: var(--text-muted);
  }
</style>
