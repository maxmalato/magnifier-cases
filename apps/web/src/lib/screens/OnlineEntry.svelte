<script lang="ts">
  import { untrack } from 'svelte'
  // Criar sala (apelido + nível) ou entrar com código (código + apelido).
  import { difficulties, levelIds, startTime, type LevelId } from '@magnifier-cases/engine'
  import { formatCode, MAX_NAME_LENGTH, normalizeCode } from '@magnifier-cases/kit'
  import Header from '../ui/Header.svelte'
  import { ApiError, createRoom, roomInfo } from '../online/api.ts'
  import { cleanName } from '../game/setup.ts'
  import { levelKey } from '../text.ts'
  import { t } from '../locale.svelte.ts'
  import type { MessageKey } from '../../i18n.ts'

  let {
    mode,
    initialCode = '',
    onready,
    onback,
  }: {
    mode: 'create' | 'join'
    initialCode?: string
    onready: (code: string, name: string) => void
    onback: () => void
  } = $props()

  let name = $state('')
  // o código do convite só preenche o campo no começo; depois a pessoa pode editar
  let code = $state(untrack(() => (initialCode ? formatCode(initialCode) : '')))
  let level = $state<LevelId>('apprentice')
  let busy = $state(false)
  let error = $state<MessageKey | null>(null)

  const errorKey = (e: unknown): MessageKey => {
    const c = e instanceof ApiError ? e.code : 'generic'
    const known = [
      'notFound',
      'invalidCode',
      'network',
      'tooManyRequests',
      'gameStarted',
      'roomFull',
    ]
    return (known.includes(c) ? `error.${c}` : 'error.generic') as MessageKey
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault()
    error = null
    const nickname = cleanName(name)
    if (nickname.length === 0) {
      error = 'lobby.errorNames'
      return
    }
    busy = true
    try {
      if (mode === 'create') {
        onready(await createRoom({ level }), nickname)
      } else {
        const normalized = normalizeCode(code)
        if (!normalized) throw new ApiError('invalidCode')
        const info = await roomInfo(normalized)
        if (info.status !== 'lobby') throw new ApiError('gameStarted')
        if (info.seats >= info.maxSeats) throw new ApiError('roomFull')
        onready(normalized, nickname)
      }
    } catch (e) {
      error = errorKey(e)
    } finally {
      busy = false
    }
  }
</script>

<main class="screen">
  <Header />
  <h1>{mode === 'create' ? t('online.createTitle') : t('online.joinTitle')}</h1>
  <form class="form" onsubmit={submit} novalidate>
    {#if mode === 'join'}
      <label class="field">
        <span>{t('online.code')}</span>
        <input
          type="text"
          autocomplete="off"
          autocapitalize="characters"
          maxlength={9}
          bind:value={code}
          aria-describedby="code-help"
        />
      </label>
      <p id="code-help" class="help">{t('online.codeHelp')}</p>
    {/if}
    <label class="field">
      <span>{t('lobby.nickname')}</span>
      <input
        type="text"
        autocomplete="off"
        maxlength={MAX_NAME_LENGTH}
        bind:value={name}
        aria-describedby="nick-help"
      />
    </label>
    <p id="nick-help" class="help">{t('lobby.nicknameHelp')}</p>
    {#if mode === 'create'}
      <fieldset>
        <legend class="label">{t('lobby.level')}</legend>
        <div class="levels">
          {#each levelIds as id (id)}
            {@const p = difficulties.find((d) => d.id === id)}
            {#if p}
              <label class="level" class:chosen={level === id}>
                <input type="radio" name="level" value={id} bind:group={level} />
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
    {/if}
    {#if error}<p class="error" role="alert">{t(error)}</p>{/if}
    <button type="submit" class="btn btn-primary" disabled={busy}>
      {mode === 'create' ? t('online.create') : t('online.join')}
    </button>
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
    gap: 12px;
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
  .help {
    margin: -6px 0 0;
    font-size: 0.9375rem;
    color: var(--text-muted);
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
    cursor: pointer;
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
  .error {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    border: 2px solid var(--accent-text);
    font-weight: 800;
  }
</style>
