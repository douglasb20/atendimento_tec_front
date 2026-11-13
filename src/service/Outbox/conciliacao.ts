import type { SupportChatMessageResponse } from '@/Interfaces';
import type { ItemFila } from '@/store/useOutboxStore';

type Apresentacao = { idLocal: string; enviadoEm: string; previewUrl?: string };
const apresentacoes = new Map<string, Apresentacao>();
const chave = (chatId: string, mensagemId: string) => JSON.stringify([String(chatId), String(mensagemId)]);

export function mensagemDaFila(item: ItemFila): SupportChatMessageResponse {
  const mensagem: SupportChatMessageResponse & { falhou?: boolean; erro?: string } = {
    id: item.id, message_id: item.id, support_chat_id: item.supportChatId,
    datetime: item.enviadoEm, created_at: item.enviadoEm, ack: 0, from_me: true,
    type: item.tipo === 'voz' ? 'ptt' : item.tipo === 'texto' ? 'chat' : (item.mediaType ?? 'document'),
    content: item.conteudo ? (item.autor ? `*${item.autor}:*\n${item.conteudo}` : item.conteudo) : '',
    has_media: item.tipo !== 'texto', media_url: item.previewUrl ?? '',
    media_type: item.mimetype ?? item.mediaType ?? '', file_name: item.fileName,
    progresso: item.status === 'falhou' ? undefined : item.progresso,
    has_quoted: Boolean(item.quotedMessageId), quoted_msg_id: item.quotedMessageId,
    is_deleted: false, is_edited: false, pending: true,
    falhou: item.status === 'falhou', erro: item.erro,
    channel_id: 0, is_automatic: false, media_size: null, quoted_msg: null,
    from: '', to: item.chatId, device_type: '', hidden_at: null, is_gif: false,
    has_reaction: false, reaction: {}, raw_payload: '{}', updated_at: item.enviadoEm,
  };
  return mensagem;
}

/** O id do provider muda; a instância da bolha e sua prévia local não precisam mudar. */
export function registrarConfirmacao(item: ItemFila, mensagemId: string) {
  apresentacoes.set(chave(item.supportChatId, mensagemId), {
    idLocal: item.id, enviadoEm: item.enviadoEm, previewUrl: item.previewUrl,
  });
}

export function conciliarMensagens(
  mensagens: SupportChatMessageResponse[], itens: ItemFila[], chatId: string,
): SupportChatMessageResponse[] {
  const confirmadas = mensagens.filter(m => String(m.support_chat_id) === String(chatId));
  const locaisConfirmados = new Set<string>();
  const resultado = confirmadas.map(mensagem => {
    const apresentacao = apresentacoes.get(chave(chatId, mensagem.message_id));
    if (!apresentacao) return mensagem;
    locaisConfirmados.add(apresentacao.idLocal);
    return {
      ...mensagem,
      // Apenas a chave visual permanece local. message_id continua sendo o
      // do WhatsApp para responder, editar, reagir e apagar normalmente.
      id: apresentacao.idLocal,
      datetime: apresentacao.enviadoEm,
      media_url: apresentacao.previewUrl && mensagem.has_media && !mensagem.is_deleted
        && !mensagem.hidden_at && !mensagem.media_expired ? apresentacao.previewUrl : mensagem.media_url,
    };
  });
  resultado.push(...itens.filter(item => String(item.supportChatId) === String(chatId)
    && !locaisConfirmados.has(item.id)).map(mensagemDaFila));
  return resultado.sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
}

/** A prévia só é necessária enquanto esta conversa estiver na tela. */
export function liberarPreviasConfirmadas(chatId: string) {
  apresentacoes.forEach((apresentacao, id) => {
    if (JSON.parse(id)[0] !== String(chatId)) return;
    if (apresentacao.previewUrl) URL.revokeObjectURL(apresentacao.previewUrl);
    apresentacoes.delete(id);
  });
}
