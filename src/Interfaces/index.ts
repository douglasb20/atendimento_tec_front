import { AnySchema } from 'yup';

import { ContactResponse } from './contact.interface';
import { ClientResponse } from './client.interface';

export * from './suport-chat.interface';
export * from './chat-store.interface';
export * from './channel.interface';
export * from './contact.interface';
export * from './client.interface';
export * from './custom-field.interface';
export * from './tag.interface';
export * from './integration.interface';
export * from './permission-group.interface';
export * from './system-settings.interface';

export enum Masks {
  DATEBR = '99/99/9999',
  CPF = '999.999.999-99',
  CNPJ = '99.999.999/9999-99',
  CELULAR = '(99) 9 9999-9999',
  FIXO = '(99) 9999-9999',
  FIXO_OPCIONAL = '(99) 9999-9999?9',
  CEP = '99999-999',
}

export type Shape<Fields = any> = {
  [Key in keyof Fields]: AnySchema<Partial<Fields[Key]>>;
};

export type JWTToken = {
  id: number;
  sub: number;
  name: string;
  email: string;
  lastlogin_at: string;
  iat: number;
  exp: number;
};

export interface IResponseError {
  message: string;
  error: string;
  statusCode: number;
}

export interface ILoginResp {
  access_token: string;
  refresh_token: string;
  expiresIn: number;
}

export interface IUsuariosResponse {
  id?: number;
  name: string;
  email: string;
  status?: number;
  /**
   * Custo/hora do atendente. **Obsoleto** — saiu do formulário e da listagem.
   *
   * Alimentava um cálculo de valor por atendimento no módulo `supports`, que
   * está parado; a consulta que o usava nem roda (é SQL de MySQL num banco
   * PostgreSQL). A coluna continua no banco.
   */
  valor_hora?: number;
  avatar_url?: string | null;
  is_requestpassword?: number;
  created_at?: string;
  lastlogin_at?: string;
  /** O grupo de permissão do usuário. Nulo significa sem acesso a nada. */
  permission_group_id?: number | null;
  /** A relação carregada, quando o endpoint a traz — para exibir o nome. */
  permissionGroup?: { id: number; name: string } | null;
}

export interface IClientResponse extends ClientResponse {
  contacts?: ContactResponse[];
}

export type AtendimentosResponse = {
  id: number;
  client_id: number;
  contact_id: number;
  user_id: number;
  data_referencia: string;
  hora_inicio: string;
  hora_fim: string;
  comentario: string;
  tipo_entrada: 'T' | 'S';
  esta_pago: number;
  atendimento_status_id: number;
  duration: string;
  cli_nome: string;
  cli_cnpj: string;
  user_nome: string;
  user_email: string;
  contact_nome: string;
  contact_telefone: string;
  status_descricao: string;
  valor_total: number;
  atendimentosServicos: AtendimentoServicos[];
};

export interface AtendimentoServicos {
  id: number;
  atendimento_id: number;
  service_id: number;
  valor_cobrado: string;
  service: IServiceResponse;
}

export interface IServiceResponse {
  id: number;
  name: string;
  valor_servico: string;
  created_at: string;
  status: number;
}

export interface IAtendimentoStatus {
  id: number;
  descricao: string;
}

export type UserInfo = IUsuariosResponse & {
  /**
   * Os nomes das permissões do usuário, vindas do papel — ex.: `client:view`.
   *
   * Apenas os nomes, de propósito: esta resposta é guardada no cookie
   * `userInfo`, que tem teto de 4 KB, e os registros completos estouravam o
   * limite. Quem precisa do rótulo legível é a tela de papéis, que busca o
   * catálogo inteiro em `/permissions`.
   */
  permissions: string[];
  /** Nulo significa sem grupo, portanto sem permissão alguma. */
  permission_group_id?: number | null;
};

/**
 * Retorno da assinatura de upload.
 *
 * O Backblaze B2 não implementa o POST-policy do S3 (responde 501), então o
 * envio é por PUT: o arquivo vai cru no corpo, sem FormData. O `key` é a chave
 * a gravar no banco - as colunas guardam a key, não a URL. `fields` sobrou por
 * compatibilidade com o formato de POST e vem vazio.
 */
export type SignatureResponse = {
  url: string;
  key: string;
  method: 'PUT';
  headers: Record<string, string>;
  fields: Record<string, string>;
};
