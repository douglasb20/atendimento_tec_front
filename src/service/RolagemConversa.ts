/** Mídia e fontes podem aumentar o histórico sem alterar a lista de mensagens. */
export function observarFimDaConversa(area: HTMLElement, conteudo: HTMLElement, deveAcompanhar: () => boolean) {
  const ajustar = () => {
    if (deveAcompanhar()) area.scrollTop = area.scrollHeight;
  };
  const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(ajustar);
  observador?.observe(conteudo);
  observador?.observe(area);
  ajustar();
  return () => observador?.disconnect();
}
