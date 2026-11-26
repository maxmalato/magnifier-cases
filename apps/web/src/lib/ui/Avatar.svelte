<script lang="ts">
  let { name, size = 56 }: { name: string; size?: number } = $props()
  const initial = $derived(name.trim().charAt(0).toLocaleUpperCase() || '?')
</script>

<span
  class="avatar"
  style:width="{size}px"
  style:height="{size}px"
  style:font-size="{size * 0.45}px"
  aria-hidden="true"
>
  {initial}
</span>

<style>
  .avatar {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--accent);
    color: var(--accent-ink);
    font-family: var(--font-title);
    font-weight: 600;
  }
</style>
