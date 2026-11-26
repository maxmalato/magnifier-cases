<script lang="ts">
  // Novo mistério: o caso, o relógio do nível (dos dados), o elenco sorteado e a ordem das vezes.
  import { formatItem, themeText, titleOf } from '@magnifier-cases/content'
  import { startTime } from '@magnifier-cases/engine'
  import type { LocalGame } from '../game/local-game.svelte.ts'
  import Header from '../ui/Header.svelte'
  import Icon from '../ui/Icon.svelte'
  import { t, tn, ui } from '../locale.svelte.ts'

  let { game, onstart }: { game: LocalGame; onstart: () => void } = $props()
  const view = $derived(game.view)
</script>

<main class="screen">
  <Header />
  <span class="chip level">{t(`level.${view.level}`)}</span>
  <h1>{themeText('theme.title', ui.locale)}</h1>
  <p class="intro">{themeText('theme.intro', ui.locale)}</p>

  <div class="panel clock">
    <span class="icon"><Icon name="clock" size={26} /></span>
    <div>
      <p class="clock-title">
        {t('briefing.clockTitle', {
          start: startTime(view.params),
          deadline: view.params.deadline,
        })}
      </p>
      <p class="clock-text">
        {tn('briefing.clockText', view.params.actionsTotal, {
          minutes: view.params.actionMinutes,
          square: formatItem('square', ui.locale, 'in'),
        })}
      </p>
    </div>
  </div>

  <section aria-labelledby="b-suspects">
    <h2 id="b-suspects" class="label">
      {t('briefing.suspects', { n: view.cast.suspects.length })}
    </h2>
    <ul class="chips">
      {#each view.cast.suspects as id (id)}<li class="chip filled">
          {titleOf(id, ui.locale)}
        </li>{/each}
    </ul>
  </section>

  <section aria-labelledby="b-places">
    <h2 id="b-places" class="label">{t('briefing.places', { n: view.cast.places.length })}</h2>
    <ul class="chips">
      {#each view.cast.places as id (id)}<li class="chip outline">
          {titleOf(id, ui.locale)}
        </li>{/each}
    </ul>
  </section>

  <div class="card secret">
    <h2>{themeText('theme.secretTitle', ui.locale)}</h2>
    <p>{themeText('theme.secretText', ui.locale)}</p>
  </div>

  <section aria-labelledby="b-order">
    <h2 id="b-order" class="label">{t('briefing.order')}</h2>
    <ol class="chips">
      {#each game.seats as seat (seat.id)}<li class="chip filled">{seat.name}</li>{/each}
    </ol>
  </section>

  <button type="button" class="btn btn-primary" onclick={onstart}>{t('briefing.start')}</button>
</main>

<style>
  h1 {
    font-size: 2rem;
  }
  .intro {
    margin: 0;
    font-size: 1.0625rem;
    color: var(--text-soft);
  }
  .level {
    align-self: flex-end;
    color: var(--accent-text);
    background: var(--panel);
    padding: 4px 12px;
    border-radius: 999px;
    font-weight: 800;
  }
  .clock {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .clock .icon {
    color: var(--accent-text);
    padding-top: 2px;
  }
  .clock p {
    margin: 0;
  }
  .clock-title {
    font-family: var(--font-title);
    font-size: 1.25rem;
  }
  .clock-text {
    color: var(--text-muted);
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    padding: 8px 14px;
    border-radius: 999px;
    font-weight: 800;
  }
  .chip.filled {
    background: var(--panel-2);
  }
  .chip.outline {
    border: 2px solid var(--outline);
  }
  .secret h2 {
    font-size: 1.25rem;
  }
  .secret p {
    margin: 4px 0 0;
    color: var(--card-muted);
  }
</style>
