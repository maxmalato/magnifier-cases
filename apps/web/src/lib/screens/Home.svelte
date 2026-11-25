<script lang="ts">
  import { appName, locales, type Locale } from '@magnifier-cases/content'
  import { setLocale, t, ui } from '../locale.svelte.ts'

  let { onplay }: { onplay: () => void } = $props()
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
    <p class="hint">{t('home.moreSoon')}</p>
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
