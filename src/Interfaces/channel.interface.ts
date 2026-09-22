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
  is_connected: number;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  channelStatus: ChannelStatus;
  /** Nulo significa "usa a integração padrão". */
  integration_id: number | null;
  /**
   * Enviada sozinha quando um contato abre uma conversa nova.
   *
   * Vazio ou nulo = não envia. Aceita as variáveis de
   * `components/EditorMensagem/variaveis.ts`.
   */
  mensagem_saudacao: string | null;
  /** Enviada ao finalizar o atendimento. Mesmas regras da saudação. */
  mensagem_despedida: string | null;
  integration?: { id: number; name: string } | null;
};

type ChannelStatus = {
  id: number;
  name: string;
};
