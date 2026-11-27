<script lang="ts">
  // Botão "Som" (ligar/desligar), em todas as telas. Nome fixo; o estado vai em aria-pressed.
  import { t } from '../locale.svelte.ts'
  import { sound } from '../sound/player.svelte.ts'
  import Icon from './Icon.svelte'
</script>

<button
  type="button"
  class="sound"
  aria-label={t('app.sound')}
  aria-pressed={sound.enabled}
  title={t(sound.enabled ? 'app.soundOn' : 'app.soundOff')}
  onclick={() => sound.setEnabled(!sound.enabled)}
>
  <Icon name={sound.enabled ? 'sound-on' : 'sound-off'} size={22} />
</button>

<style>
  .sound {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border-radius: 999px;
    border: 2px solid var(--outline);
    background: var(--panel);
    color: var(--text);
    cursor: pointer;
  }
  .sound[aria-pressed='false'] {
    color: var(--text-muted);
  }
</style>
