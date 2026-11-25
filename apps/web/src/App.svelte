<script lang="ts">
  // Etapa 0: só a página de "em construção". As telas entram na Etapa 3, depois da simulação.
  import { appName } from '@magnifier-cases/content'
  import { pickLocale, t } from './i18n.ts'

  const locale = pickLocale(navigator.languages)
  document.documentElement.lang = locale
</script>

<main>
  <img src="/logo-icon.svg" alt={t(locale, 'app.logoAlt')} width="128" height="128" />
  <h1>{appName}</h1>
  <p>{t(locale, 'app.tagline')}</p>
  <p class="status">{t(locale, 'app.status')}</p>
</main>

<style>
  main {
    display: grid;
    place-items: center;
    gap: 0.75rem;
    min-height: 100dvh;
    padding: 1.5rem;
    text-align: center;
    align-content: center;
  }

  h1 {
    margin: 0;
    font-size: clamp(2rem, 6vw, 3.5rem);
  }

  p {
    margin: 0;
    max-width: 32rem;
    font-size: 1.125rem;
  }

  .status {
    color: var(--text-muted);
  }
</style>
