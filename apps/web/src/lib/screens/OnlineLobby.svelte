<script lang="ts">
  // Lobby online: código da sala para mostrar aos outros, detetives conectados, bots e nível.
  // Só quem comanda a sala muda o nível, adiciona bots e começa a partida.
  import { difficulties, levelIds, startTime } from '@magnifier-cases/engine'
  import { formatCode } from '@magnifier-cases/kit'
  import Header from '../ui/Header.svelte'
  import type { OnlineGame } from '../online/online-game.svelte.ts'
  import { roomLink } from '../online/link.ts'
  import { levelKey } from '../text.ts'
  import { t } from '../locale.svelte.ts'
  import type { MessageKey } from '../../i18n.ts'

  let { game, onleave }: { game: OnlineGame; onleave: () => void } = $props()
  const room = $derived(game.room)
  let copied = $state(false)

  const hostName = $derived(room?.seats.find((s) => s.seat === room.host)?.name ?? '')
  const errorText = $derived.by(() => {
    if (!game.error) return null
    const known = ['notEnoughSeats', 'someoneAway', 'roomFull', 'tooManyRequests']
    return t((known.includes(game.error) ? `error.${game.error}` : 'error.generic') as MessageKey)
  })

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(roomLink(game.connection.code))
      copied = true
    } catch {
      copied = false
    }
  }
</script>

<main class="screen">
  <Header />
  {#if room}
    <h1>{t('online.lobbyTitle', { code: '' })}<span class="code">{formatCode(room.code)}</span></h1>
    <p class="share">{t('online.share')}</p>
    <button type="button" class="btn" onclick={copyLink}>
      {copied ? t('online.copied') : t('online.copyLink')}
    </button>

    <section class="panel" aria-labelledby="seats-title">
      <h2 id="seats-title" class="label">{t('lobby.seats')}</h2>
      <ol class="seats">
        {#each room.seats as seat (seat.seat)}
          <li>
            <span class="name">
              {seat.name}
              {#if seat.seat === game.mySeat}<span class="tag">({t('online.you')})</span>{/if}
              {#if seat.seat === room.host}<span class="tag">· {t('online.host')}</span>{/if}
              {#if seat.kind === 'human' && seat.presence !== 'connected'}
                <span class="tag">· {t(`online.presence.${seat.presence}` as MessageKey)}</span>
              {/if}
            </span>
            {#if game.isHost && seat.seat !== game.mySeat && (seat.kind === 'bot' || seat.presence !== 'connected')}
              <button type="button" class="btn small" onclick={() => game.removeSeat(seat.seat)}>
                {t('online.remove', { name: seat.name })}
              </button>
            {/if}
          </li>
        {/each}
      </ol>
      {#if game.isHost && room.seats.length < 6}
        <button type="button" class="btn" onclick={() => game.addBot()}>
          {t('online.addBot')}
        </button>
      {/if}
    </section>

    <fieldset>
      <legend class="label">{t('lobby.level')}</legend>
      <div class="levels">
        {#each levelIds as id (id)}
          {@const p = difficulties.find((d) => d.id === id)}
          {#if p}
            <label class="level" class:chosen={room.config.level === id}>
              <input
                type="radio"
                name="level"
                value={id}
                checked={room.config.level === id}
                disabled={!game.isHost}
                onchange={() => game.setLevel(id)}
              />
              <span class="level-name">{t(levelKey(id))}</span>
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

    {#if errorText}<p class="error" role="alert">{errorText}</p>{/if}
    {#if game.isHost}
      <button type="button" class="btn btn-primary" onclick={() => game.start()}>
        {t('online.start')}
      </button>
    {:else}
      <p class="wait" role="status">{t('online.waitingHost', { name: hostName })}</p>
    {/if}
  {:else}
    <p role="status">{t('online.connecting')}</p>
  {/if}
  <button type="button" class="btn" onclick={onleave}>{t('online.leave')}</button>
</main>

<style>
  h1 {
    font-size: 1.875rem;
  }
  .code {
    display: block;
    font-size: 2.75rem;
    letter-spacing: 0.08em;
    color: var(--accent-text);
  }
  .share,
  .wait {
    margin: 0;
    color: var(--text-muted);
  }
  .seats {
    list-style: none;
    margin: 8px 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .seats li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    flex-wrap: wrap;
    min-height: 44px;
  }
  .name {
    font-weight: 800;
  }
  .tag {
    font-weight: 600;
    color: var(--text-muted);
  }
  .small {
    min-height: 44px;
    padding: 0 12px;
  }
  fieldset {
    border: 0;
    margin: 0;
    padding: 0;
  }
  legend {
    margin-bottom: 8px;
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
  .level input:disabled {
    cursor: default;
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
  .error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    border: 2px solid var(--accent-text);
    font-weight: 800;
  }
</style>
