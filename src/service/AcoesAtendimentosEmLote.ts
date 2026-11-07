import { SupportChatsResponse, SupportChatStatusId } from '@/Interfaces';

export type FluxoSaidaLote = { id: number; name: string; executar_por_padrao: boolean; pode_alterar: boolean };
export type PreparacaoFinalizacaoLote = { conversa: SupportChatsResponse; fluxo: FluxoSaidaLote | null; erro?: string };
export type ResultadoAcaoLote<T = unknown> = { id: string; sucesso: true; dados: T } | { id: string; sucesso: false; erro: string };

export function erroDaAcaoEmLote(erro: unknown): string {
  const mensagem = (erro as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(mensagem) ? mensagem.join(' ') : typeof mensagem === 'string' ? mensagem : 'Não foi possível concluir. Confira o estado da conversa antes de tentar novamente.';
}

/** Cada atendimento tem seu resultado; uma falha não esconde os demais. Sem retry automático de envios. */
export async function executarAcaoEmLote<T>(
  ids: string[], acao: (id: string) => Promise<T>, progresso?: (concluidos: number, total: number) => void,
): Promise<ResultadoAcaoLote<T>[]> {
  const unicos = Array.from(new Set(ids.map(String)));
  const resultados: ResultadoAcaoLote<T>[] = [];
  for (const id of unicos) {
    try { resultados.push({ id, sucesso: true, dados: await acao(id) }); }
    catch (erro) { resultados.push({ id, sucesso: false, erro: erroDaAcaoEmLote(erro) }); }
    progresso?.(resultados.length, unicos.length);
  }
  return resultados;
}

export const finalizaSemAtendimentoLote = (conversa: SupportChatsResponse): boolean =>
  !conversa.pos_atendimento_ativo && [SupportChatStatusId.AGUARDANDO, SupportChatStatusId.EM_FILA].includes(conversa.support_chat_status_id);

export function impedimentoFinalizacaoLote(conversa: SupportChatsResponse, usuarioId: number | null, superusuario: boolean, podeFinalizar: boolean): string | undefined {
  if (!podeFinalizar) return 'Você não tem permissão para finalizar atendimentos.';
  if (conversa.pos_atendimento_ativo) return 'O fluxo de saída deste atendimento já está em andamento.';
  if (finalizaSemAtendimentoLote(conversa)) return undefined;
  if (conversa.support_chat_status_id !== SupportChatStatusId.EM_ANDAMENTO) return 'Este atendimento não está aberto para finalização.';
  if (!superusuario && (usuarioId == null || String(conversa.user_id) !== String(usuarioId))) return 'Somente quem assumiu o atendimento pode finalizá-lo.';
  if (!conversa.contact?.client_id && !conversa.contact?.has_no_client) return 'Associe o contato a um cliente ou marque Contato sem cliente antes de finalizar.';
  return undefined;
}

export function corpoFinalizacaoLote(fluxo: FluxoSaidaLote | null, enviarDespedida: boolean, executarSaida: boolean) {
  return {
    sem_despedida: !enviarDespedida,
    // Sem permissão, o servidor aplica o padrão atual, inclusive se ele mudou após a consulta.
    ...(fluxo && !fluxo.pode_alterar ? {} : { executar_fluxo_saida: !!fluxo && executarSaida }),
  };
}

export function manterSelecaoDisponivel(ids: string[], conversas: SupportChatsResponse[]): string[] {
  const disponiveis = new Set(conversas.map(conversa => String(conversa.id)));
  return ids.filter(id => disponiveis.has(String(id)));
}

export const chaveSaidaLote = (item: PreparacaoFinalizacaoLote) =>
  `${item.conversa.channel_id}:${item.fluxo?.id}:${item.fluxo?.executar_por_padrao}:${item.fluxo?.pode_alterar}`;

export function gruposSaidaLote(itens: PreparacaoFinalizacaoLote[]) {
  const grupos = new Map<string, { chave: string; canal: string; fluxo: FluxoSaidaLote; quantidade: number }>();
  for (const item of itens) {
    if (!item.fluxo || item.erro) continue;
    const chave = chaveSaidaLote(item);
    const grupo = grupos.get(chave);
    if (grupo) grupo.quantidade++;
    else grupos.set(chave, { chave, canal: item.conversa.channel?.name || 'Canal', fluxo: item.fluxo, quantidade: 1 });
  }
  return Array.from(grupos.values());
}
