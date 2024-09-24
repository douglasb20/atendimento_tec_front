import { AnySchema } from 'yup';

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

export interface JWTToken {
  sub: string;
  iss: string;
  authorities: string[];
  aud: string;
  nbf: number;
  user_id: string;
  produtos: string[];
  scope: string[];
  cpf: string;
  name: string;
  exp: number;
  iat: number;
}

export interface IResponseError {
  message: string;
  error: string;
  statusCode: number;
}

export interface IClientes {
  id: number;
  nome: string;
  cnpj: string;
  created_at: string;
  status: number;
}

export interface IClientResponse extends IClientes{
  contacts?: IContactResponse[]
}

export interface IContactResponse {
  id: number;
  clients_id: number;
  nome_contato: string;
  telefone_contato: string;
  created_at: string;
  status: number;
}

export type ContactTable = {
  id?: string | null;
  nome_contato: string;
  telefone_contato?: string;
  tipo?: 'new' | 'old';
};

export interface AtendimentosResponse {
  id: number;
  clients_id: number;
  contacts_id: number;
  users_id: number;
  data_referencia: string;
  hora_inicio: string;
  hora_fim: string;
  comentario: null;
  tipo_entrada: string;
  atendimento_status_id: number;
  duration: string;
  cli_nome: string;
  cli_cnpj: string;
  user_nome: string;
  user_email: string;
  contact_nome: string;
  contact_telefone: string;
  status_descricao: string;
}
