import { ChannelResponse } from './channel.interface';

/**
 * Aviso temporário enviado na abertura do atendimento.
 *
 * O caso de uso: um serviço externo cai - a Sefaz, por exemplo - e todo mundo
 * chama pelo mesmo motivo. O aviso chega logo depois da saudação, antes de a
 * pessoa digitar a dúvida.
 *
 * ⚠️ Não confundir com a **saudação do canal**: aquela é permanente e descreve
 * o atendimento; esta é temporária e descreve um problema.
 */
export type ServiceAlertResponse = {
  id: number;
  /** Só para achar o aviso na lista. O cliente não o vê. */
  titulo: string;
  /** O que vai para o WhatsApp. Aceita as variáveis de mensagem. */
  mensagem: string;
  ativo: boolean;
  /** Nulo: vale até desligarem. */
  expira_em: string | null;
  /** **Vazio significa todos os canais** - a convenção do backend. */
  channels: ChannelResponse[];
  created_at: string;
  updated_at: string | null;
};

/** O que a tela envia ao salvar. */
export type ServiceAlertForm = {
  id?: number;
  titulo: string;
  mensagem: string;
  ativo: boolean;
  expira_em: Date | null;
  /** Vazio = todos os canais. */
  channel_ids: number[];
};
