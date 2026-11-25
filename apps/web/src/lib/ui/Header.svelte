<script lang="ts">
  import { appName } from '@magnifier-cases/content'
  import { t } from '../locale.svelte.ts'
  import Icon from './Icon.svelte'

  let { clock }: { clock?: string } = $props()
</script>

<header class="header">
  <span class="brand">{appName}</span>
  {#if clock}
    <span
      class="pill"
      role="status"
      aria-live="polite"
      aria-label={t('app.clock', { time: clock })}
    >
      <span class="icon"><Icon name="clock" size={18} /></span>
      <span aria-hidden="true">{clock}</span>
    </span>
  {/if}
</header>

<style>
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 40px;
  }
  .brand {
    font-family: var(--font-title);
    font-weight: 600;
    font-size: 1.25rem;
  }
  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--panel);
    font-size: 1.125rem;
    font-weight: 800;
  }
  .icon {
    display: inline-flex;
    color: var(--accent-text);
  }
</style>
