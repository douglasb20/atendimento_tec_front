/**
 * `message_id` que já entraram na tela e não devem animar de novo.
 *
 * Existe por causa da troca de identidade da mensagem própria: a bolha otimista
 * nasce com o id da fila (`envio-…`) e, quando o webhook chega, é substituída
 * pela definitiva, com o id do WhatsApp. São dois ids para a mesma mensagem — e
 * sem este registro ela animaria duas vezes, uma ao ser enviada e outra ao ser
 * confirmada, que é o efeito estranho de a bolha "pular" sozinha depois.
 *
 * Fora da store de propósito: é detalhe de apresentação, não estado do chat, e
 * gravá-lo na store faria cada envio propagar re-render para todos os
 * componentes que a assinam.
 */
let ids = new Set<string>();

/** Limite frouxo: só evita crescer sem fim numa sessão longa. */
const MAXIMO = 500;

export const marcaComoAnimada = (messageId?: string) => {
  if (!messageId) return;

  // Estourado o teto, recomeça vazio em vez de podar item a item: reanimar uma
  // bolha antiga é inofensivo, e a conversa já rolou muito para chegar aqui.
  if (ids.size >= MAXIMO) ids = new Set<string>();

  ids.add(String(messageId));
};

export const jaAnimou = (messageId?: string) => Boolean(messageId) && ids.has(String(messageId));
