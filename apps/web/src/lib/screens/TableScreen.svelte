<script lang="ts">
  // Mesa (tela grande: TV, notebook ou tablet). Só mostra a partida; cada um joga no próprio
  // celular. Mostra o mapa, a pista mais recente, as contagens, o caderno compacto (sempre
  // visível: na TV sem toque ninguém precisa abrir nada) e a vez de cada um.
  import { formatItem, formatList, nameOf, renderClue, themeText } from '@magnifier-cases/content'
  import { formatCode } from '@magnifier-cases/kit'
  import type { NotebookEntry } from '@magnifier-cases/engine'
  import type { OnlineGame } from '../online/online-game.svelte.ts'
  import ActionSegments from '../ui/ActionSegments.svelte'
  import Avatar from '../ui/Avatar.svelte'
  import Icon from '../ui/Icon.svelte'
  import NoticeBar from '../ui/NoticeBar.svelte'
  import PlaceGrid from '../ui/PlaceGrid.svelte'
  import QrCode from '../ui/QrCode.svelte'
  import SoundToggle from '../ui/SoundToggle.svelte'
  import { roomLink } from '../online/link.ts'
  import { suggestionText } from '../text.ts'
  import { duration, t, ui } from '../locale.svelte.ts'
  import { appName } from '@magnifier-cases/content'

  let { game, onclose }: { game: OnlineGame; onclose: () => void } = $props()

  const room = $derived(game.room)
  const view = $derived(room?.game ?? null)
  const code = $derived(room ? formatCode(room.code) : '')
  const host = $derived(room?.seats.find((s) => s.seat === room.host)?.name ?? '')
  const latest = $derived(
    view ? [...view.opened].sort((a, b) => b.openedAtAction - a.openedAtAction)[0] : undefined,
  )
  const latestNumber = $derived(
    latest && view ? view.opened.findIndex((c) => c.id === latest.id) + 1 : 0,
  )
  const nameOfSeat = (id: string) => room?.seats.find((s) => s.seat === id)?.name ?? '?'

  function badge(entry: NotebookEntry): { text: string; kind: 'off' | 'group' | 'open' } {
    if (entry.status === 'eliminated') return { text: t('notebook.discarded'), kind: 'off' }
    const id = entry.inGroupOf.at(-1)
    const card = view?.opened.find((c) => c.id === id)
    if (card && 'ids' in card.effect)
      return { text: t('notebook.oneOf', { n: card.effect.ids.length }), kind: 'group' }
    return { text: t('notebook.open'), kind: 'open' }
  }
</script>

{#snippet notebook(list: readonly NotebookEntry[], title: string)}
  <div class="nb-col">
    <h3 class="label">{title}</h3>
    <ul>
      {#each list as entry (entry.id)}
        {@const b = badge(entry)}
        <li>
          <span class:struck={b.kind === 'off'}>{nameOf(entry.id, ui.locale)}</span>
          <span
            class="badge"
            class:badge-off={b.kind === 'off'}
            class:badge-group={b.kind === 'group'}
          >
            {b.text}
          </span>
        </li>
      {/each}
    </ul>
  </div>
{/snippet}

<main class="table">
  <NoticeBar online={game.online} placement="top" />

  {#if !room}
    <p class="big" role="status">{t('online.connecting')}</p>
  {:else if room.status === 'lobby'}
    <header class="head">
      <h1>{appName}</h1>
      <span class="end">
        <span class="subtitle">{themeText('theme.title', ui.locale)}</span>
        <SoundToggle />
      </span>
    </header>
    <section class="lobby">
      <div class="card join">
        <p class="join-text">{t('table.joinHere')}</p>
        <p class="code" aria-label={room.code.split('').join(' ')}>{code}</p>
        <p class="join-text small">{t('table.scan')}</p>
        <div class="qr-box">
          <QrCode text={roomLink(room.code)} label={t('table.qrLabel', { code })} size={220} />
        </div>
        <p class="join-text small">{t('table.firstCommands')}</p>
      </div>
      <div class="panel players">
        <h2 class="label">{t('table.players')}</h2>
        {#if room.seats.length === 0}
          <p>{t('table.nobody')}</p>
        {:else}
          <ul class="chips">
            {#each room.seats as seat (seat.seat)}
              <li class="chip"><Avatar name={seat.name} size={36} /> {seat.name}</li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>
    <button type="button" class="btn close" onclick={onclose}>{t('table.close')}</button>
  {:else if view && view.phase !== 'playing' && view.reveal}
    {@const reveal = view.reveal}
    <section class="reveal" role="status" aria-live="polite">
      <Avatar name={nameOf(reveal.solution.culpritId, ui.locale)} size={120} />
      <span class="label">{view.phase === 'won' ? t('reveal.solved') : t('reveal.timeout')}</span>
      <h1>
        {themeText('theme.revealCulprit', ui.locale, { culprit: [reveal.solution.culpritId] })}
      </h1>
      <p class="lead">
        {themeText('theme.revealHideout', ui.locale, { hideout: [reveal.solution.hideoutId] })}
      </p>
      <div class="card keys">
        <h2 class="label">{t('reveal.keyClues')}</h2>
        <ol>
          {#each reveal.keyCards as card (card.id)}<li>{renderClue(card, ui.locale)}</li>{/each}
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
      </div>
      <p>{t('reveal.waitHost', { name: host })}</p>
    </section>
  {:else if view}
    <header class="head">
      <div class="title">
        <h1>{appName}</h1>
        <span class="subtitle">{themeText('theme.title', ui.locale)}</span>
      </div>
      <div class="clock">
        <div class="segments">
          <ActionSegments
            total={view.params.actionsTotal}
            left={view.actionsLeft}
            deadline={view.params.deadline}
          />
        </div>
        <span class="pill" role="status" aria-live="polite">
          <span class="icon"><Icon name="clock" size={22} /></span>
          {view.clock}
        </span>
        <SoundToggle />
      </div>
    </header>

    <div class="main">
      <section class="map" aria-label={t('turn.map')}>
        <h2 class="label">{t('turn.map')}</h2>
        <PlaceGrid {view} large />
      </section>

      <section class="side">
        <article class="card latest" aria-live="polite">
          {#if latest}
            {#key latest.id}
              <div class="anim-pop">
                <span class="label">
                  {t('table.latest', {
                    n: latestNumber,
                    source: nameOf(latest.source.id, ui.locale),
                    name: nameOfSeat(latest.openedBySeat),
                  })}
                </span>
                <p class="clue">{renderClue(latest, ui.locale)}</p>
              </div>
            {/key}
          {:else}
            <p class="clue">{t('table.noClue')}</p>
          {/if}
        </article>

        {#if game.overlay?.kind === 'wrong'}
          <p class="wrong" role="status">
            {t('table.wrong', {
              name: game.overlay.seat.name,
              suspect: formatItem(game.overlay.suspectId, ui.locale),
              place: formatItem(game.overlay.placeId, ui.locale, 'in'),
              duration: duration(game.overlay.minutes),
            })}
          </p>
        {/if}

        <div class="panel counts">
          <div>
            <strong>
              {t('table.countOf', {
                n: view.candidates.suspects.length,
                total: view.cast.suspects.length,
              })}
            </strong>
            <span>{t('table.suspectsLeft')}</span>
          </div>
          <div>
            <strong>
              {t('table.countOf', {
                n: view.candidates.places.length,
                total: view.cast.places.length,
              })}
            </strong>
            <span>{t('table.placesLeft')}</span>
          </div>
          <div>
            <strong>{view.opened.length}</strong>
            <span>{t('table.clues')}</span>
          </div>
        </div>

        <section class="panel notebook" aria-label={t('notebook.title')}>
          {@render notebook(view.notebook.suspects, t('notebook.suspects'))}
          {@render notebook(view.notebook.places, t('notebook.places'))}
        </section>
      </section>
    </div>

    <footer class="panel foot">
      <ul class="chips">
        {#each room.seats as seat (seat.seat)}
          {@const active = seat.seat === view.activeSeat}
          <li class="chip" class:active class:anim-ring={active}>
            <Avatar name={seat.name} size={32} />
            {seat.name}
            {#if active}<span class="deciding">{t('table.deciding')}</span>{/if}
          </li>
        {/each}
      </ul>
      <span class="who">{t('table.choosing', { name: nameOfSeat(view.activeSeat), code })}</span>
      {#if game.online.suggestions.length > 0}
        <ul class="suggestions" aria-label={t('suggest.title')}>
          {#each game.online.suggestions as s (s.seat.id)}
            <li>
              {t('suggest.by', { name: s.seat.name, what: suggestionText(s.target, ui.locale) })}
            </li>
          {/each}
        </ul>
      {/if}
    </footer>
  {/if}
</main>

<style>
  .table {
    min-height: 100dvh;
    padding: clamp(16px, 2.5vw, 40px) clamp(16px, 3.5vw, 56px);
    display: flex;
    flex-direction: column;
    gap: 18px;
    font-size: clamp(1rem, 1.25vw, 1.375rem);
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .end {
    display: inline-flex;
    align-items: center;
    gap: 16px;
  }
  .title {
    display: flex;
    align-items: baseline;
    gap: 16px;
    flex-wrap: wrap;
  }
  h1 {
    font-size: clamp(1.75rem, 2.8vw, 2.75rem);
  }
  .subtitle {
    font-size: 1.25em;
    font-weight: 700;
    color: var(--text-muted);
  }
  .clock {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .segments {
    width: clamp(200px, 22vw, 360px);
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 999px;
    background: var(--panel);
    font-size: 1.5em;
    font-weight: 800;
  }
  .icon {
    display: inline-flex;
    color: var(--accent-text);
  }
  .main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 28px;
    flex: 1;
  }
  .map,
  .side {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .latest .clue {
    margin: 8px 0 0;
    font-family: var(--font-title);
    font-weight: 500;
    font-size: 1.75em;
    line-height: 1.2;
  }
  .wrong {
    margin: 0;
    padding: 12px 16px;
    border-radius: 14px;
    border: 3px solid var(--accent-text);
    font-weight: 800;
  }
  .counts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }
  .counts div {
    display: flex;
    flex-direction: column;
  }
  .counts strong {
    font-family: var(--font-title);
    font-size: 1.9em;
    color: var(--accent-text);
    line-height: 1.1;
  }
  .counts span {
    font-weight: 700;
    color: var(--text-soft);
  }
  .notebook {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
  }
  .notebook ul {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .notebook li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    font-weight: 800;
  }
  .foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-wrap: wrap;
  }
  .chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 4px 14px 4px 4px;
    border-radius: 999px;
    border: 2px solid transparent;
    font-weight: 800;
  }
  .chip.active {
    border-color: var(--accent);
    background: var(--panel-2);
  }
  .deciding {
    color: var(--accent-text);
  }
  .who {
    font-weight: 700;
    color: var(--text-soft);
  }
  .suggestions {
    width: 100%;
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px 18px;
    font-weight: 700;
  }
  .lobby {
    display: grid;
    grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
    gap: 28px;
    align-items: start;
  }
  .join {
    text-align: center;
  }
  .join-text {
    margin: 0;
    font-size: 1.3em;
    font-weight: 700;
  }
  .join-text.small {
    font-size: 1em;
    color: var(--card-muted);
  }
  .code {
    margin: 12px 0;
    font-family: var(--font-title);
    font-size: clamp(3rem, 8vw, 7rem);
    letter-spacing: 0.08em;
    line-height: 1;
  }
  .qr-box {
    display: flex;
    justify-content: center;
    margin: 12px 0;
  }
  .players p {
    margin: 8px 0 0;
  }
  .players .chips {
    margin-top: 10px;
  }
  .close {
    align-self: flex-start;
  }
  .reveal {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }
  .reveal h1 {
    font-size: clamp(2.5rem, 4vw, 4rem);
  }
  .lead {
    margin: 0;
    font-size: 1.4em;
    font-weight: 700;
  }
  .keys {
    max-width: 900px;
    text-align: left;
  }
  .keys ol {
    margin: 10px 0 0;
    padding-left: 24px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-weight: 700;
  }
  .hint {
    margin: 12px 0 0;
    color: var(--card-muted);
    font-weight: 700;
  }
  .big {
    font-size: 1.5em;
  }
</style>
