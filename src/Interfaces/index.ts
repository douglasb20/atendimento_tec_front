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