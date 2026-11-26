<script lang="ts">
  import type { LocalGame } from '../game/local-game.svelte.ts'
  import Header from '../ui/Header.svelte'
  import PlaceGrid from '../ui/PlaceGrid.svelte'
  import { t } from '../locale.svelte.ts'

  let {
    game,
    onpick,
    onback,
  }: { game: LocalGame; onpick: (placeId: string) => void; onback: () => void } = $props()
</script>

<main class="screen">
  <Header clock={game.view.clock} />
  <h1>{t('choose.placeTitle')}</h1>
  <PlaceGrid view={game.view} {onpick} />
  <button type="button" class="btn" onclick={onback}>{t('app.back')}</button>
</main>

<style>
  h1 {
    font-size: 1.75rem;
  }
</style>
