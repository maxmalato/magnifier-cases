<script lang="ts">
  import { appName, locales, type Locale } from '@magnifier-cases/content'
  import { formatCode } from '@magnifier-cases/kit'
  import { setLocale, t, ui } from '../locale.svelte.ts'

  let {
    onplay,
    oncreate,
    onjoin,
    savedCode,
    savedIsTable = false,
    onrejoin,
    ontable,
    tableBlocked = false,
  }: {
    onplay: () => void
    oncreate: () => void
    onjoin: () => void
    /** Sala guardada neste aparelho (para voltar pelo token). */
    savedCode: string | null
    /** A sala guardada é a de uma mesa (este aparelho é a tela grande). */
    savedIsTable?: boolean
    onrejoin: () => void
    /** Abrir a mesa: só existe em tela grande (canShowTable). */
    ontable?: (() => void) | undefined
    /** Pediram a mesa (?mesa) num aparelho pequeno: mostra o aviso. */
    tableBlocked?: boolean
  } = $props()
  const languageNames: Record<Locale, string> = { 'pt-BR': 'Português', en: 'English' }
</script>

<main class="screen home">
  <div class="hero">
    <img src="/logo-icon.svg" alt="" width="120" height="120" />
    <h1>{appName}</h1>
    <p class="tagline">{t('app.tagline')}</p>
  </div>

  <div class="actions">
    <button type="button" class="btn btn-primary" onclick={onplay}>{t('home.playLocal')}</button>
    <p class="hint">{t('home.playLocalHint')}</p>
    <button type="button" class="btn" onclick={oncreate}>{t('home.createRoom')}</button>
    <button type="button" class="btn" onclick={onjoin}>{t('home.joinRoom')}</button>
    {#if savedCode}
      <button type="button" class="btn" onclick={onrejoin}>
        {savedIsTable
          ? t('home.backToTable', { code: formatCode(savedCode) })
          : t('home.backToRoom', { code: formatCode(savedCode) })}
      </button>
    {/if}
    {#if ontable}
      <button type="button" class="btn" onclick={ontable}>{t('home.openTable')}</button>
      <p class="hint">{t('home.openTableHint')}</p>
    {/if}
    {#if tableBlocked}
      <p class="blocked" role="status">{t('home.tableOnlyBig')}</p>
    {/if}
  </div>

  <fieldset class="lang">
    <legend class="label">{t('app.language')}</legend>
    {#each locales as locale (locale)}
      <button
        type="button"
        class="btn"
        aria-pressed={ui.locale === locale}
        lang={locale}
        onclick={() => setLocale(locale)}
      >
        {languageNames[locale]}
      </button>
    {/each}
  </fieldset>
</main>

<style>
  .home {
    justify-content: center;
    text-align: center;
    gap: 28px;
  }
  .hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  h1 {
    font-size: clamp(2.25rem, 8vw, 3.25rem);
  }
  .tagline {
    margin: 0;
    font-size: 1.125rem;
    color: var(--text-soft);
  }
  .actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .blocked {
    margin: 0;
    padding: 10px 12px;
    border-radius: 12px;
    border: 2px solid var(--accent-text);
    font-weight: 800;
  }
  .hint {
    margin: 0;
    color: var(--text-muted);
  }
  .lang {
    border: 0;
    padding: 0;
    margin: 0;
    display: flex;
    justify-content: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .lang legend {
    width: 100%;
    margin-bottom: 8px;
  }
  .lang .btn[aria-pressed='true'] {
    border-color: var(--accent);
    background: var(--panel);
  }
</style>
