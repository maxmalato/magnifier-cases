<script lang="ts">
  // Montar a equipe: nível, detetives (pessoa com apelido digitado ou bot) e ordem das vezes.
  import { difficulties, levelIds, startTime, type LevelId } from '@magnifier-cases/engine'
  import { MAX_NAME_LENGTH } from '@magnifier-cases/kit'
  import Header from '../ui/Header.svelte'
  import { MAX_SEATS, setupError, type SeatDraft } from '../game/setup.ts'
  import { t } from '../locale.svelte.ts'

  let {
    level = $bindable(),
    seats = $bindable(),
    onstart,
    onback,
  }: {
    level: LevelId
    seats: SeatDraft[]
    onstart: () => void
    onback: () => void
  } = $props()

  let tried = $state(false)
  const error = $derived(setupError(seats))

  function botNumber(index: number): number {
    return seats.slice(0, index + 1).filter((s) => s.kind === 'bot').length
  }
  function label(seat: SeatDraft, index: number): string {
    return seat.kind === 'bot'
      ? t('lobby.botName', { n: botNumber(index) })
      : seat.name.trim() || t('lobby.seat', { n: index + 1 })
  }
  function setKind(index: number, kind: SeatDraft['kind']) {
    seats[index] = { ...seats[index], kind } as SeatDraft
  }
  function submit(event: SubmitEvent) {
    event.preventDefault()
    tried = true
    if (!error) onstart()
  }
</script>

<main class="screen">
  <Header />
  <h1>{t('lobby.title')}</h1>

  <form class="form" onsubmit={submit} novalidate>
    <fieldset>
      <legend class="label">{t('lobby.level')}</legend>
      <div class="levels">
        {#each levelIds as id (id)}
          {@const p = difficulties.find((d) => d.id === id)}
          {#if p}
            <label class="level" class:chosen={level === id}>
              <input type="radio" name="level" value={id} bind:group={level} />
              <span class="level-name">{t(`level.${id}`)}</span>
              <span class="level-info">
                {t('lobby.levelInfo', {
                  suspects: p.suspectCount,
                  places: p.placeCount,
                  start: startTime(p),
                })}
              </span>
            </label>
          {/if}
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend class="label">{t('lobby.seats')}</legend>
      <ol class="seats">
        {#each seats as seat, i (i)}
          <li class="seat panel">
            <div class="seat-top">
              <span class="seat-title">{t('lobby.seat', { n: i + 1 })}</span>
              <div class="kind" role="group" aria-label={label(seat, i)}>
                <button
                  type="button"
                  class="btn small"
                  aria-pressed={seat.kind === 'human'}
                  onclick={() => setKind(i, 'human')}
                >
                  {t('lobby.person')}
                </button>
                <button
                  type="button"
                  class="btn small"
                  aria-pressed={seat.kind === 'bot'}
                  onclick={() => setKind(i, 'bot')}
                >
                  {t('lobby.bot')}
                </button>
              </div>
            </div>
            {#if seat.kind === 'human'}
              <label class="field">
                <span>{t('lobby.nickname')}</span>
                <input
                  type="text"
                  autocomplete="off"
                  maxlength={MAX_NAME_LENGTH}
                  bind:value={seat.name}
                  aria-describedby="nickname-help"
                />
              </label>
            {:else}
              <p class="bot-name">{label(seat, i)}</p>
            {/if}
            {#if seats.length > 2}
              <button type="button" class="btn small remove" onclick={() => seats.splice(i, 1)}>
                {t('lobby.removeSeat', { name: label(seat, i) })}
              </button>
            {/if}
          </li>
        {/each}
      </ol>
      <p id="nickname-help" class="help">{t('lobby.nicknameHelp')}</p>
      {#if seats.length < MAX_SEATS}
        <button type="button" class="btn" onclick={() => seats.push({ kind: 'bot', name: '' })}>
          {t('lobby.addSeat')}
        </button>
      {/if}
    </fieldset>

    {#if tried && error}
      <p class="error" role="alert">{t(`lobby.${error}`)}</p>
    {/if}

    <button type="submit" class="btn btn-primary">{t('lobby.start')}</button>
    <button type="button" class="btn" onclick={onback}>{t('app.back')}</button>
  </form>
</main>

<style>
  h1 {
    font-size: 1.875rem;
  }
  .form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .levels {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 8px;
  }
  .level {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border-radius: 12px;
    border: 2px solid var(--outline);
    cursor: pointer;
    min-height: 44px;
  }
  .level.chosen {
    border: 3px solid var(--accent);
    background: var(--panel);
  }
  .level input {
    position: absolute;
    opacity: 0;
    inset: 0;
    cursor: pointer;
  }
  .level:has(input:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
  }
  .level-name {
    font-family: var(--font-title);
    font-size: 1.125rem;
  }
  .level-info {
    font-size: 0.875rem;
    color: var(--text-muted);
  }
  .seats {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .seat {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .seat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
  }
  .seat-title {
    font-weight: 800;
  }
  .kind {
    display: flex;
    gap: 6px;
  }
  .small {
    min-height: 44px;
    padding: 0 12px;
    font-size: 0.9375rem;
  }
  .kind .btn[aria-pressed='true'] {
    background: var(--accent);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-weight: 700;
  }
  input[type='text'] {
    min-height: 48px;
    padding: 0 12px;
    border-radius: 12px;
    border: 2px solid var(--outline);
    background: var(--bg);
    font-size: 1.0625rem;
  }
  .bot-name {
    margin: 0;
    color: var(--text-soft);
  }
  .remove {
    align-self: flex-start;
  }
  .help {
    margin: 0;
    font-size: 0.9375rem;
    color: var(--text-muted);
  }
  .error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    border: 2px solid var(--accent-text);
    font-weight: 800;
  }
</style>
