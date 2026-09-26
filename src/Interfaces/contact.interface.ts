import { ValorCampoResponse } from './custom-field.interface';
import { ClientResponse } from './client.interface';

export type ContactResponse = {
  id: number;
  client_id: number | null;
  name: string;
  /** Sobrenome; nulo em contato de empresa ou vindo do `pushName`. */
  last_name?: string | null;
  avatar_url: string;
  is_avatar_external: number;
  phone: string;
  remote_jid: string;
  created_at: string;
  updated_at: string;
  status: number;
  client: ClientResponse | null;
  /** Contato que nunca terá cliente associado (fornecedor, parceiro etc) -
   * marcado, finalizar atendimento com ele deixa de exigir cliente. */
  has_no_client?: boolean;
  /** Foto definida manualmente (upload) - marcado, o webhook de mensagem
   * recebida não sobrescreve mais com a foto do WhatsApp. */
  avatar_is_manual?: boolean;
  /** Marcado, a mensagem deste contato é descartada já no webhook - nunca
   * vira atendimento, protocolo ou histórico. */
  ignore_support?: boolean;

  /** Campos personalizados preenchidos, com a definição carregada. */
  camposPersonalizados?: ValorCampoResponse[];
};
