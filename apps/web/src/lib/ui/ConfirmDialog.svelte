<script lang="ts">
  // Confirmação antes de toda ação que gasta tempo (não existe desfazer). Usa o <dialog> nativo:
  // foco preso dentro dele e Esc para voltar.
  import { t } from '../locale.svelte.ts'

  let {
    title,
    text,
    onconfirm,
    oncancel,
  }: { title: string; text: string; onconfirm: () => void; oncancel: () => void } = $props()

  let dialog: HTMLDialogElement | undefined = $state()

  $effect(() => {
    if (dialog && !dialog.open) dialog.showModal()
  })
</script>

<dialog
  bind:this={dialog}
  class="dialog"
  aria-labelledby="confirm-title"
  oncancel={(e) => {
    e.preventDefault()
    oncancel()
  }}
>
  <h2 id="confirm-title">{title}</h2>
  <p>{text}</p>
  <div class="row">
    <button type="button" class="btn" onclick={oncancel}>{t('confirm.no')}</button>
    <button type="button" class="btn btn-primary" onclick={onconfirm}>{t('confirm.yes')}</button>
  </div>
</dialog>

<style>
  .dialog {
    border: 0;
    border-radius: 20px;
    padding: 22px 20px;
    width: min(92vw, 420px);
    background: var(--card);
    color: var(--card-ink);
  }
  .dialog::backdrop {
    background: rgb(20 14 24 / 0.6);
  }
  h2 {
    font-size: 1.5rem;
  }
  p {
    margin: 10px 0 18px;
    font-size: 1.0625rem;
  }
  .row {
    display: flex;
    gap: 10px;
  }
  .row .btn {
    flex: 1;
    color: var(--card-ink);
  }
</style>
