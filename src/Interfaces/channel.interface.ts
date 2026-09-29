import { TipoAnexo } from './quick-reply.interface';

/**
 * Estados do canal, espelhando a tabela `channel_status` do backend.
 *
 * O número aparecia cru pela tela (`channel_status_id === 3`); aqui ele ganha
 * nome uma vez só.
 */
export enum ChannelStatusId {
  DESCONECTADO = 1,
  CONECTANDO = 2,
  CONECTADO = 3,
  SESSAO_EXPIRADA = 4,
  EXCLUIDO = 5,
}

export type ChannelResponse = {
  id: number;
  name: string;
  phone_number: string;
  session_id: string;
  channel_status_id: number;
  qr_code: string | null;
  /** Código de pareamento (`XXXX-XXXX`), para conectar por telefone sem QR. */
  pairing_code: string | null;
  is_connected: number;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  channelStatus: ChannelStatus;
  /**
   * Enviada sozinha quando um contato abre uma conversa nova.
   *
   * Vazio ou nulo = não envia. Aceita as variáveis de
   * `components/EditorMensagem/variaveis.ts`.
   */
  mensagem_saudacao: string | null;
  /** A key do anexo da saudação no storage. Nulo quando não há anexo. */
  saudacao_anexo_key: string | null;
  saudacao_anexo_nome: string | null;
  saudacao_anexo_mimetype: string | null;
  saudacao_anexo_tipo: TipoAnexo | null;
  /** Só na leitura: a URL pública, montada a partir da key. */
  saudacao_anexo_url?: string;
  /** Enviada ao finalizar o atendimento. Mesmas regras da saudação. */
  mensagem_despedida: string | null;
  /** Anexo da despedida - independente do de saudação, mesmas regras dele. */
  despedida_anexo_key: string | null;
  despedida_anexo_nome: string | null;
  despedida_anexo_mimetype: string | null;
  despedida_anexo_tipo: TipoAnexo | null;
  despedida_anexo_url?: string;
  /** Os setores atendidos por este canal - só vem populado por
   * `GET /channels/:id` (`findChannelComSetores`), não na listagem. */
  departments?: { id: number; name: string }[];
  /** Enviado ao salvar - substitui todos os vínculos do canal com setores. */
  department_ids?: number[];
};

type ChannelStatus = {
  id: number;
  name: string;
};
