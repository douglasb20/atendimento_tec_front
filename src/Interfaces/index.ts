import { AnySchema } from 'yup';

import { ContactResponse } from './contact.interface';
import { ClientResponse } from './client.interface';

export * from './suport-chat.interface';
export * from './chat-store.interface';
export * from './channel.interface';
export * from './contact.interface';
export * from './client.interface';

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
  valor_hora?: number;
  avatar_url?: string | null;
  is_requestpassword?: number;
  created_at?: string;
  lastlogin_at?: string;
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
  permissions: string[];
};

type FieldsSignature = {
  acl: string;
  bucket: string;
  'X-Amz-Algorithm': string;
  'X-Amz-Credential': string;
  'X-Amz-Date': string;
  key: string;
  Policy: string;
  'X-Amz-Signature': string;
};

export type SignatureResponse = {
  url: string;
  fields: FieldsSignature;
};
