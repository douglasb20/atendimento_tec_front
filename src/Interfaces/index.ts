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
export * from './quick-reply.interface';
export * from './service-alert.interface';
export * from './system-settings.interface';
export * from './internal-chat.interface';
export * from './user-config.interface';

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
  /**
   * ⚠️ Opcional de propósito: tokens emitidos **antes** da separação de
   * nome/sobrenome não têm este campo, e continuam válidos até expirar. Quem
   * lê precisa tolerar a ausência em vez de mostrar "undefined".
   */
  last_name?: string | null;
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
  last_name?: string | null;
  email: string;
  status?: number;
  /**
   * Custo/hora do atendente. **Obsoleto** - saiu do formulário e da listagem.
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
  /** A relação carregada, quando o endpoint a traz - para exibir o nome. */
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
   * Os nomes das permissões do usuário, vindas do papel - ex.: `client:view`.
   *
   * Apenas os nomes, de propósito: esta resposta é guardada no cookie
   * `userInfo`, que tem teto de 4 KB, e os registros completos estouravam o
   * limite. Quem precisa do rótulo legível é a tela de papéis, que busca o
   * catálogo inteiro em `/permissions`.
   */
  permissions: string[];
  /** Nulo significa sem grupo, portanto sem permissão alguma. */
  permission_group_id?: number | null;
  /** Cor escolhida para a interface. Nulo = nunca escolheu, usa o padrão. */
  tema?: string | null;
  /** `claro`, `escuro` ou `dim`. Nulo = nunca escolheu. */
  modo_tema?: string | null;
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
