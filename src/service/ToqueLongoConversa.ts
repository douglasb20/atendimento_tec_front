/** O gesto não bloqueia a rolagem: mover o dedo cancela a abertura do menu. */
export function registrarToqueLongoConversa(
  cartao: HTMLElement,
  abrir: (evento: PointerEvent) => void,
): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inicio: PointerEvent | null = null;
  let bloquearClique = false;

  const cancelar = () => {
    clearTimeout(timer);
    timer = undefined;
    inicio = null;
  };

  const pressionar = (evento: PointerEvent) => {
    cancelar();
    if (!evento.isPrimary) return;
    bloquearClique = false;
    if (evento.pointerType !== 'touch' && evento.pointerType !== 'pen') return;
    if ((evento.target as Element).closest('button, a, input, textarea, select, [role="button"]')) return;

    inicio = evento;
    timer = setTimeout(() => {
      timer = undefined;
      if (!inicio) return;
      bloquearClique = true;
      abrir(inicio);
    }, 550);
  };

  const mover = (evento: PointerEvent) => {
    if (inicio && (evento.pointerId !== inicio.pointerId
      || Math.hypot(evento.clientX - inicio.clientX, evento.clientY - inicio.clientY) > 10)) cancelar();
  };

  const bloquearAberturaDaConversa = (evento: MouseEvent) => {
    if (!bloquearClique) return;
    evento.preventDefault();
    evento.stopPropagation();
    bloquearClique = false;
  };

  const bloquearMenuNativo = (evento: MouseEvent) => {
    if (inicio || bloquearClique) evento.preventDefault();
    // Alguns navegadores disparam o contextmenu antes dos 550 ms e depois
    // cancelam o ponteiro. Aproveita esse gesto antes que cancelem o timer.
    if (inicio && !bloquearClique) {
      clearTimeout(timer);
      timer = undefined;
      bloquearClique = true;
      abrir(inicio);
    }
  };

  cartao.addEventListener('pointerdown', pressionar);
  cartao.addEventListener('pointermove', mover, { passive: true });
  cartao.addEventListener('pointerup', cancelar);
  cartao.addEventListener('pointercancel', cancelar);
  cartao.addEventListener('pointerleave', cancelar);
  cartao.addEventListener('click', bloquearAberturaDaConversa, true);
  cartao.addEventListener('contextmenu', bloquearMenuNativo);

  return () => {
    cancelar();
    cartao.removeEventListener('pointerdown', pressionar);
    cartao.removeEventListener('pointermove', mover);
    cartao.removeEventListener('pointerup', cancelar);
    cartao.removeEventListener('pointercancel', cancelar);
    cartao.removeEventListener('pointerleave', cancelar);
    cartao.removeEventListener('click', bloquearAberturaDaConversa, true);
    cartao.removeEventListener('contextmenu', bloquearMenuNativo);
  };
}
